import { describe, expect, it, vi } from "vitest"
import {
  isQueuedManifestationJobTimedOut,
  processStaleManifestationJobs,
} from "@/lib/server/manifestation-job-maintenance"
import type { ManifestationJob } from "@/lib/server/manifestation-jobs"

const userId = "00000000-0000-4000-8000-000000000001"
const manifestationId = "00000000-0000-4000-8000-000000000002"
const jobId = "00000000-0000-4000-8000-000000000003"
const now = new Date("2026-06-08T12:00:00.000Z").getTime()
const context = {
  route: "/api/cron/manifestation-jobs",
  requestId: "request-1",
  userId: null,
}

function job(overrides: Partial<ManifestationJob> = {}): ManifestationJob {
  return {
    id: jobId,
    user_id: userId,
    manifestation_id: manifestationId,
    payment_id: null,
    mode: "default",
    query: "Manifest a clean launch",
    lat: 25.2048,
    lon: 55.2708,
    status: "queued",
    attempts: 0,
    max_attempts: 3,
    next_attempt_at: new Date(now - 1000).toISOString(),
    timeout_at: null,
    result: null,
    error: null,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    ...overrides,
  }
}

describe("manifestation job maintenance", () => {
  it("releases and fails processing jobs whose callback window timed out", async () => {
    const timedOutJob = job({
      status: "processing",
      timeout_at: new Date(Date.now() - 1000).toISOString(),
      next_attempt_at: null,
    })
    const releaseManifestationAttempt = vi.fn(async () => undefined)
    const markManifestationJobFailed = vi.fn(async () => ({ ...timedOutJob, status: "failed" as const }))
    const triggerManifestationJob = vi.fn()

    const result = await processStaleManifestationJobs(
      { context, now },
      {
        getDueManifestationJobs: vi.fn(async () => [timedOutJob]),
        releaseManifestationAttempt,
        markManifestationJobFailed,
        triggerManifestationJob,
      },
    )

    expect(result).toEqual({ checked: 1, retried: 0, timedOut: 1, failed: 1, released: 1 })
    expect(releaseManifestationAttempt).toHaveBeenCalledWith(userId, manifestationId, "Manifestation workflow timed out")
    expect(markManifestationJobFailed).toHaveBeenCalledWith(jobId, "Manifestation workflow timed out")
    expect(triggerManifestationJob).not.toHaveBeenCalled()
  })

  it("retries queued jobs that are due but not stale", async () => {
    const queuedJob = job()
    const triggerManifestationJob = vi.fn(async () => ({ ...queuedJob, status: "processing" as const }))
    const releaseManifestationAttempt = vi.fn(async () => undefined)

    const result = await processStaleManifestationJobs(
      { context, now },
      {
        getDueManifestationJobs: vi.fn(async () => [queuedJob]),
        triggerManifestationJob,
        releaseManifestationAttempt,
      },
    )

    expect(result).toEqual({ checked: 1, retried: 1, timedOut: 0, failed: 0, released: 0 })
    expect(triggerManifestationJob).toHaveBeenCalledWith(queuedJob)
    expect(releaseManifestationAttempt).not.toHaveBeenCalled()
  })

  it("fails and releases queued jobs that aged past the reservation timeout", async () => {
    const staleQueuedJob = job({ created_at: new Date(now - 16 * 60_000).toISOString() })
    const releaseManifestationAttempt = vi.fn(async () => undefined)
    const markManifestationJobFailed = vi.fn(async () => ({ ...staleQueuedJob, status: "failed" as const }))
    const triggerManifestationJob = vi.fn()

    const result = await processStaleManifestationJobs(
      { context, now },
      {
        getDueManifestationJobs: vi.fn(async () => [staleQueuedJob]),
        releaseManifestationAttempt,
        markManifestationJobFailed,
        triggerManifestationJob,
      },
    )

    expect(isQueuedManifestationJobTimedOut(staleQueuedJob, now)).toBe(true)
    expect(result).toEqual({ checked: 1, retried: 0, timedOut: 1, failed: 1, released: 1 })
    expect(triggerManifestationJob).not.toHaveBeenCalled()
  })

  it("alerts when a cron run sees high Make failure volume", async () => {
    const jobs = Array.from({ length: 3 }, (_, index) =>
      job({
        id: `00000000-0000-4000-8000-00000000000${index + 3}`,
        manifestation_id: `00000000-0000-4000-8000-00000000001${index}`,
      }),
    )
    const emitAlert = vi.fn()

    const result = await processStaleManifestationJobs(
      { context, now, failureAlertThreshold: 2 },
      {
        getDueManifestationJobs: vi.fn(async () => jobs),
        triggerManifestationJob: vi.fn(async (input: ManifestationJob) => ({ ...input, status: "failed" as const })),
        releaseManifestationAttempt: vi.fn(async () => undefined),
        emitAlert,
      },
    )

    expect(result.failed).toBe(3)
    expect(result.released).toBe(3)
    expect(emitAlert).toHaveBeenCalledWith("make_failure", context, expect.objectContaining({ failed: 3 }))
  })
})
