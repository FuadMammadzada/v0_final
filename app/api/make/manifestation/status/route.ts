import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth"
import {
  getManifestationJobForUser,
  isJobTimedOut,
  markManifestationJobFailed,
  triggerManifestationJob,
} from "@/lib/server/manifestation-jobs"
import { releaseManifestationAttempt } from "@/lib/server/manifestation-access"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

const statusSchema = z.object({
  jobId: z.string().uuid(),
})

async function getProfile(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from("user_profiles")
    .select("id,email,name,last_manifestation,manifestation_count,bonus_searches")
    .eq("id", userId)
    .maybeSingle()
  return data ?? null
}

export async function GET(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "make-manifestation-status",
    limit: 120,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const auth = await authenticateRequest(request)
  if (!auth) return unauthorizedResponse()

  const url = new URL(request.url)
  const parsed = statusSchema.safeParse({ jobId: url.searchParams.get("jobId") })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  let job = await getManifestationJobForUser(parsed.data.jobId, auth.user.id)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if ((job.status === "queued" || job.status === "processing") && isJobTimedOut(job)) {
    await releaseManifestationAttempt(auth.user.id, job.manifestation_id, "Manifestation workflow timed out").catch(
      () => undefined,
    )
    job = await markManifestationJobFailed(job.id, "Manifestation workflow timed out")
  }

  if (job.status === "queued" && (!job.next_attempt_at || new Date(job.next_attempt_at).getTime() <= Date.now())) {
    job = await triggerManifestationJob(job)
    if (job.status === "failed") {
      await releaseManifestationAttempt(auth.user.id, job.manifestation_id, "Manifestation workflow failed").catch(
        () => undefined,
      )
    }
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    error: job.error,
    data: job.status === "completed" ? job.result : null,
    profile: job.status === "completed" ? await getProfile(auth.user.id) : null,
  })
}
