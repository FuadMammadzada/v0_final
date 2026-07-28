import "server-only"

import type { RequestLogContext } from "./logger"
import { logError, logEvent } from "./logger"
import { releaseManifestationAttempt } from "./manifestation-access"
import {
  getDueManifestationJobs,
  isJobTimedOut,
  markManifestationJobFailed,
  triggerManifestationJob,
  type ManifestationJob,
} from "./manifestation-jobs"
import { emitAlert } from "./monitoring"

const QUEUED_JOB_TIMEOUT_MS = 15 * 60_000

export type ManifestationJobMaintenanceResult = {
  checked: number
  retried: number
  timedOut: number
  failed: number
  released: number
}

type ManifestationJobMaintenanceDeps = {
  getDueManifestationJobs?: typeof getDueManifestationJobs
  triggerManifestationJob?: typeof triggerManifestationJob
  markManifestationJobFailed?: typeof markManifestationJobFailed
  releaseManifestationAttempt?: typeof releaseManifestationAttempt
  emitAlert?: typeof emitAlert
}

export function isQueuedManifestationJobTimedOut(job: ManifestationJob, now = Date.now()) {
  return job.status === "queued" && new Date(job.created_at).getTime() + QUEUED_JOB_TIMEOUT_MS <= now
}

async function releaseReservation(
  job: ManifestationJob,
  reason: string,
  context: RequestLogContext,
  releaseAttempt: typeof releaseManifestationAttempt,
) {
  try {
    await releaseAttempt(job.user_id, job.manifestation_id, reason)
    return true
  } catch (error) {
    logError("Unable to release stale manifestation reservation", context, error, { jobId: job.id })
    return false
  }
}

export async function processStaleManifestationJobs(
  options: {
    context: RequestLogContext
    limit?: number
    failureAlertThreshold?: number
    now?: number
  },
  deps: ManifestationJobMaintenanceDeps = {},
): Promise<ManifestationJobMaintenanceResult> {
  const getDueJobs = deps.getDueManifestationJobs ?? getDueManifestationJobs
  const triggerJob = deps.triggerManifestationJob ?? triggerManifestationJob
  const markFailed = deps.markManifestationJobFailed ?? markManifestationJobFailed
  const releaseAttempt = deps.releaseManifestationAttempt ?? releaseManifestationAttempt
  const alert = deps.emitAlert ?? emitAlert
  const result: ManifestationJobMaintenanceResult = {
    checked: 0,
    retried: 0,
    timedOut: 0,
    failed: 0,
    released: 0,
  }

  const jobs = await getDueJobs(options.limit ?? 50)
  result.checked = jobs.length

  for (const job of jobs) {
    try {
      if (job.status === "processing" && isJobTimedOut(job)) {
        result.timedOut += 1
        if (await releaseReservation(job, "Manifestation workflow timed out", options.context, releaseAttempt)) {
          result.released += 1
        }
        await markFailed(job.id, "Manifestation workflow timed out")
        result.failed += 1
        continue
      }

      if (job.status === "queued" && isQueuedManifestationJobTimedOut(job, options.now)) {
        result.timedOut += 1
        if (await releaseReservation(job, "Manifestation workflow timed out", options.context, releaseAttempt)) {
          result.released += 1
        }
        await markFailed(job.id, "Manifestation workflow timed out")
        result.failed += 1
        continue
      }

      if (job.status === "queued") {
        const retriedJob = await triggerJob(job)
        result.retried += 1

        if (retriedJob.status === "failed") {
          if (await releaseReservation(job, "Manifestation workflow failed", options.context, releaseAttempt)) {
            result.released += 1
          }
          result.failed += 1
        }
      }
    } catch (error) {
      logError("Unable to process stale manifestation job", options.context, error, { jobId: job.id })
      if (await releaseReservation(job, "Manifestation workflow failed", options.context, releaseAttempt)) {
        result.released += 1
      }
      await markFailed(job.id, "Manifestation workflow failed").catch((markError) => {
        logError("Unable to mark stale manifestation job failed", options.context, markError, { jobId: job.id })
      })
      result.failed += 1
    }
  }

  if (result.failed >= (options.failureAlertThreshold ?? 5)) {
    alert("make_failure", options.context, {
      area: "manifestation_job_cron",
      checked: result.checked,
      failed: result.failed,
      timedOut: result.timedOut,
    })
  }

  logEvent("info", "Processed stale manifestation jobs", options.context, result)
  return result
}
