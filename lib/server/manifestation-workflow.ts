import "server-only"

import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateRequest, unauthorizedResponse } from "./auth"
import { getOptionalEnv, getRequiredEnv } from "./env"
import { createRequestLogContext } from "./logger"
import { callMakeWebhook } from "./make-webhook"
import { createManifestationJob, triggerManifestationJob } from "./manifestation-jobs"
import {
  finalizeManifestationAttempt,
  releaseManifestationAttempt,
  reserveManifestationAttempt,
  type ManifestationMode,
} from "./manifestation-access"
import { checkRateLimit } from "./rate-limit"
import { captureServerError, emitAlert } from "./monitoring"
import { parseJsonBody, querySchema } from "./request"

const manifestationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  query: querySchema,
  mode: z.enum(["default", "complete_108"]).default("default"),
})

export type ManifestationWorkflowDeps = {
  authenticateRequest?: typeof authenticateRequest
  checkRateLimit?: typeof checkRateLimit
  getRequiredEnv?: typeof getRequiredEnv
  getOptionalEnv?: typeof getOptionalEnv
  reserveManifestationAttempt?: typeof reserveManifestationAttempt
  finalizeManifestationAttempt?: typeof finalizeManifestationAttempt
  releaseManifestationAttempt?: typeof releaseManifestationAttempt
  callMakeWebhook?: typeof callMakeWebhook
  createManifestationJob?: typeof createManifestationJob
  triggerManifestationJob?: typeof triggerManifestationJob
}

function workflowUrl(mode: ManifestationMode, getEnv: typeof getRequiredEnv) {
  return mode === "complete_108" ? getEnv("MAKE_COMPLETE_108_WEBHOOK_URL") : getEnv("MAKE_MANIFESTATION_WEBHOOK_URL")
}

function serializeWorkflowResponse(data: unknown) {
  return JSON.stringify(data ?? null).slice(0, 20_000)
}

export async function handleManifestationRequest(request: Request, deps: ManifestationWorkflowDeps = {}) {
  const context = createRequestLogContext(request, "/api/make/manifestation")
  
  // In development, allow more frequent manifestation attempts (20 per 60s)
  // In production, limit to 6 per 60s
  const isDev = process.env.NODE_ENV === "development"
  
  const rateLimited = await (deps.checkRateLimit ?? checkRateLimit)(request, {
    key: "make-manifestation",
    limit: isDev ? 20 : 6,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const auth = await (deps.authenticateRequest ?? authenticateRequest)(request)
  if (!auth) {
    return unauthorizedResponse()
  }

  const parsed = await parseJsonBody(request, manifestationSchema, { maxBytes: 4096 })
  if (!parsed.ok) return parsed.response
  const mode: ManifestationMode = parsed.data.mode ?? "default"

  let makeWebhookUrl: string
  try {
    makeWebhookUrl = workflowUrl(mode, deps.getRequiredEnv ?? getRequiredEnv)
  } catch {
    return NextResponse.json({ error: "Manifestation workflow is not configured" }, { status: 503 })
  }

  const reservation = await (deps.reserveManifestationAttempt ?? reserveManifestationAttempt)(
    auth.user.id,
    mode,
    parsed.data.query,
  )

  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error }, { status: reservation.status })
  }

  const callbackSecret = (deps.getOptionalEnv ?? getOptionalEnv)("MAKE_CALLBACK_SECRET")
  if (!callbackSecret) {
    try {
      const data = await (deps.callMakeWebhook ?? callMakeWebhook)(
        makeWebhookUrl,
        {
          lat: parsed.data.lat,
          lon: parsed.data.lon,
          query: parsed.data.query,
          userId: auth.user.id,
          mode,
        },
        240_000,
      )
      const profile = await (deps.finalizeManifestationAttempt ?? finalizeManifestationAttempt)(
        auth.user.id,
        reservation.manifestationId,
        serializeWorkflowResponse(data),
      )

      return NextResponse.json({ data, profile })
    } catch (error) {
      await (deps.releaseManifestationAttempt ?? releaseManifestationAttempt)(
        auth.user.id,
        reservation.manifestationId,
        "Manifestation workflow failed",
      ).catch(() => undefined)

      captureServerError(error, { ...context, userId: auth.user.id }, { area: "make_manifestation_direct" })
      emitAlert("make_failure", { ...context, userId: auth.user.id }, { mode })
      return NextResponse.json({ error: "Manifestation workflow failed" }, { status: 502 })
    }
  }

  try {
    const job = await (deps.createManifestationJob ?? createManifestationJob)({
      userId: auth.user.id,
      manifestationId: reservation.manifestationId,
      paymentId: reservation.paymentId,
      mode,
      query: parsed.data.query,
      lat: parsed.data.lat,
      lon: parsed.data.lon,
    })

    const triggeredJob = await (deps.triggerManifestationJob ?? triggerManifestationJob)(job)
    if (triggeredJob.status === "failed") {
      await (deps.releaseManifestationAttempt ?? releaseManifestationAttempt)(
        auth.user.id,
        reservation.manifestationId,
        "Manifestation workflow failed",
      ).catch(() => undefined)
      emitAlert("make_failure", { ...context, userId: auth.user.id }, { jobId: triggeredJob.id })
      return NextResponse.json({ error: "Manifestation workflow failed" }, { status: 502 })
    }

    return NextResponse.json(
      {
        jobId: triggeredJob.id,
        status: triggeredJob.status,
      },
      { status: 202 },
    )
  } catch (error) {
    await (deps.releaseManifestationAttempt ?? releaseManifestationAttempt)(
      auth.user.id,
      reservation.manifestationId,
      "Manifestation workflow failed",
    ).catch(() => undefined)

    captureServerError(error, { ...context, userId: auth.user.id }, { area: "make_manifestation_submit" })
    emitAlert("make_failure", { ...context, userId: auth.user.id }, { mode })
    return NextResponse.json({ error: "Manifestation workflow failed" }, { status: 502 })
  }
}
