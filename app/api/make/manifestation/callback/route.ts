import { NextResponse } from "next/server"
import { z } from "zod"
import { getRequiredEnv } from "@/lib/server/env"
import { finalizeManifestationAttempt, releaseManifestationAttempt } from "@/lib/server/manifestation-access"
import { getManifestationJob, markManifestationJobCompleted, markManifestationJobFailed } from "@/lib/server/manifestation-jobs"
import { createRequestLogContext } from "@/lib/server/logger"
import { captureServerError, emitAlert } from "@/lib/server/monitoring"
import { parseJsonBody } from "@/lib/server/request"

const callbackSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["completed", "failed"]).default("completed"),
  data: z.unknown().optional(),
  error: z.string().max(500).optional(),
})

function serializeWorkflowResponse(data: unknown) {
  return JSON.stringify(data ?? null).slice(0, 20_000)
}

export async function POST(request: Request) {
  const context = createRequestLogContext(request, "/api/make/manifestation/callback")
  const secret = request.headers.get("x-make-callback-secret")
  if (!secret || secret !== getRequiredEnv("MAKE_CALLBACK_SECRET")) {
    emitAlert("api_error", context, { area: "make_callback_auth" })
    return NextResponse.json({ error: "Invalid callback secret" }, { status: 401 })
  }

  const parsed = await parseJsonBody(request, callbackSchema, { maxBytes: 128_000 })
  if (!parsed.ok) return parsed.response

  try {
    const job = await getManifestationJob(parsed.data.jobId)
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (job.status === "completed") {
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (parsed.data.status === "failed") {
      await releaseManifestationAttempt(job.user_id, job.manifestation_id, parsed.data.error ?? "Make workflow failed")
      await markManifestationJobFailed(job.id, parsed.data.error ?? "Make workflow failed")
      emitAlert("make_failure", context, { jobId: job.id })
      return NextResponse.json({ received: true })
    }

    await finalizeManifestationAttempt(job.user_id, job.manifestation_id, serializeWorkflowResponse(parsed.data.data))
    await markManifestationJobCompleted(job.id, parsed.data.data ?? null)

    return NextResponse.json({ received: true })
  } catch (error) {
    captureServerError(error, context, { area: "make_callback" })
    emitAlert("make_failure", context, { jobId: parsed.data.jobId })
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 })
  }
}
