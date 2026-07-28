import "server-only"

import { z } from "zod"
import { getAppUrl, getRequiredEnv } from "./env"
import { callMakeWebhook } from "./make-webhook"
import type { ManifestationMode } from "./manifestation-access"
import { createSupabaseAdminClient } from "./supabase"

const jobSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  manifestation_id: z.string().uuid(),
  payment_id: z.string().uuid().nullable(),
  mode: z.enum(["default", "complete_108"]),
  query: z.string(),
  lat: z.number(),
  lon: z.number(),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  attempts: z.number(),
  max_attempts: z.number(),
  next_attempt_at: z.string().nullable(),
  timeout_at: z.string().nullable(),
  result: z.unknown().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ManifestationJob = z.infer<typeof jobSchema>

function parseJob(data: unknown): ManifestationJob {
  const parsed = jobSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error("Invalid manifestation job")
  }
  return parsed.data
}

function workflowUrl(mode: ManifestationMode) {
  return mode === "complete_108"
    ? getRequiredEnv("MAKE_COMPLETE_108_WEBHOOK_URL")
    : getRequiredEnv("MAKE_MANIFESTATION_WEBHOOK_URL")
}

export async function createManifestationJob(input: {
  userId: string
  manifestationId: string
  paymentId: string | null
  mode: ManifestationMode
  query: string
  lat: number
  lon: number
}) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("manifestation_jobs")
    .insert({
      user_id: input.userId,
      manifestation_id: input.manifestationId,
      payment_id: input.paymentId,
      mode: input.mode,
      query: input.query,
      lat: input.lat,
      lon: input.lon,
      status: "queued",
      next_attempt_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) {
    throw new Error("Unable to create manifestation job")
  }

  return parseJob(data)
}

export async function getManifestationJobForUser(jobId: string, userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("manifestation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error("Unable to load manifestation job")
  return data ? parseJob(data) : null
}

export async function getManifestationJob(jobId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("manifestation_jobs").select("*").eq("id", jobId).maybeSingle()
  if (error) throw new Error("Unable to load manifestation job")
  return data ? parseJob(data) : null
}

export async function getDueManifestationJobs(limit = 50) {
  const supabase = createSupabaseAdminClient()
  const now = new Date()
  const staleQueuedCutoff = new Date(now.getTime() - 15 * 60_000).toISOString()
  const nowIso = now.toISOString()

  const queuedLimit = Math.max(1, Math.ceil(limit / 2))
  const processingLimit = Math.max(1, limit - queuedLimit)

  const { data: queuedJobs, error: queuedError } = await supabase
    .from("manifestation_jobs")
    .select("*")
    .eq("status", "queued")
    .or([`next_attempt_at.lte.${nowIso}`, "next_attempt_at.is.null", `created_at.lte.${staleQueuedCutoff}`].join(","))
    .order("created_at", { ascending: true })
    .limit(queuedLimit)

  const { data: processingJobs, error: processingError } = await supabase
    .from("manifestation_jobs")
    .select("*")
    .eq("status", "processing")
    .lte("timeout_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(processingLimit)

  if (queuedError || processingError) throw new Error("Unable to load due manifestation jobs")

  return [...(queuedJobs ?? []), ...(processingJobs ?? [])]
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .slice(0, limit)
    .map(parseJob)
}

async function updateJob(jobId: string, values: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("manifestation_jobs")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("*")
    .single()

  if (error) throw new Error("Unable to update manifestation job")
  return parseJob(data)
}

export async function markManifestationJobCompleted(jobId: string, result: unknown) {
  return updateJob(jobId, {
    status: "completed",
    result,
    error: null,
    timeout_at: null,
    next_attempt_at: null,
  })
}

export async function markManifestationJobFailed(jobId: string, error: string) {
  return updateJob(jobId, {
    status: "failed",
    error: error.slice(0, 500),
    timeout_at: null,
    next_attempt_at: null,
  })
}

async function markManifestationJobRetry(job: ManifestationJob, error: unknown) {
  const message = error instanceof Error ? error.message : "Make trigger failed"
  const exhausted = job.attempts >= job.max_attempts
  return updateJob(job.id, {
    status: exhausted ? "failed" : "queued",
    error: message.slice(0, 500),
    timeout_at: null,
    next_attempt_at: exhausted ? null : new Date(Date.now() + Math.min(job.attempts, 5) * 30_000).toISOString(),
  })
}

export async function triggerManifestationJob(job: ManifestationJob) {
  const processingJob = await updateJob(job.id, {
    status: "processing",
    attempts: job.attempts + 1,
    error: null,
    timeout_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  })

  try {
    await callMakeWebhook(
      workflowUrl(processingJob.mode),
      {
        jobId: processingJob.id,
        callbackUrl: `${getAppUrl()}/api/make/manifestation/callback`,
        callbackSecret: getRequiredEnv("MAKE_CALLBACK_SECRET"),
        lat: processingJob.lat,
        lon: processingJob.lon,
        query: processingJob.query,
        userId: processingJob.user_id,
        mode: processingJob.mode,
      },
      10_000,
    )

    return processingJob
  } catch (error) {
    return markManifestationJobRetry(processingJob, error)
  }
}

export function isJobTimedOut(job: ManifestationJob) {
  return Boolean(job.timeout_at && new Date(job.timeout_at).getTime() <= Date.now())
}
