import { NextResponse } from "next/server"
import { getRequiredEnv } from "@/lib/server/env"
import { createRequestLogContext } from "@/lib/server/logger"
import { processStaleManifestationJobs } from "@/lib/server/manifestation-job-maintenance"
import { captureServerError } from "@/lib/server/monitoring"

function cronAuthorized(request: Request) {
  let expected: string
  try {
    expected = getRequiredEnv("CRON_SECRET")
  } catch {
    return { ok: false as const, status: 503, error: "Cron is not configured" }
  }

  const bearer = request.headers.get("authorization")
  const headerSecret = request.headers.get("x-cron-secret")
  const authorized = bearer === `Bearer ${expected}` || headerSecret === expected

  return authorized
    ? { ok: true as const }
    : { ok: false as const, status: 401, error: "Cron authorization required" }
}

export async function GET(request: Request) {
  const auth = cronAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const context = createRequestLogContext(request, "/api/cron/manifestation-jobs")

  try {
    const result = await processStaleManifestationJobs({ context })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    captureServerError(error, context, { area: "manifestation_job_cron" })
    return NextResponse.json({ error: "Unable to process manifestation jobs" }, { status: 500 })
  }
}
