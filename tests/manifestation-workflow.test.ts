import { describe, expect, it, vi } from "vitest"
import type { AuthenticatedRequest } from "@/lib/server/auth"
import { handleManifestationRequest, type ManifestationWorkflowDeps } from "@/lib/server/manifestation-workflow"

const userId = "00000000-0000-4000-8000-000000000001"
const manifestationId = "00000000-0000-4000-8000-000000000002"
const paymentId = "00000000-0000-4000-8000-000000000003"

const job = {
  id: "00000000-0000-4000-8000-000000000004",
  user_id: userId,
  manifestation_id: manifestationId,
  payment_id: null,
  mode: "default" as const,
  query: "Manifest a resilient launch",
  lat: 25.2048,
  lon: 55.2708,
  status: "processing" as const,
  attempts: 1,
  max_attempts: 3,
  next_attempt_at: null,
  timeout_at: new Date(Date.now() + 60_000).toISOString(),
  result: null,
  error: null,
  created_at: new Date("2026-06-08T00:00:00.000Z").toISOString(),
  updated_at: new Date("2026-06-08T00:00:00.000Z").toISOString(),
}

function manifestationRequest(mode: "default" | "complete_108" = "default") {
  return new Request("http://localhost/api/make/manifestation", {
    method: "POST",
    body: JSON.stringify({
      lat: 25.2048,
      lon: 55.2708,
      query: "Manifest a resilient launch",
      mode,
    }),
  })
}

function deps(overrides: Partial<ManifestationWorkflowDeps> = {}): ManifestationWorkflowDeps {
  return {
    authenticateRequest: vi.fn(async () => ({
      token: "token",
      user: { id: userId } as AuthenticatedRequest["user"],
    })),
    checkRateLimit: vi.fn(async () => null),
    getRequiredEnv: vi.fn((name: string) => `https://make.test/${name}`),
    reserveManifestationAttempt: vi.fn(async () => ({ ok: true as const, manifestationId, paymentId: null })),
    releaseManifestationAttempt: vi.fn(async () => undefined),
    createManifestationJob: vi.fn(async () => job),
    triggerManifestationJob: vi.fn(async () => job),
    ...overrides,
  }
}

describe("handleManifestationRequest", () => {
  it("blocks unpaid complete_108 requests before calling Make", async () => {
    const triggerManifestationJob = vi.fn(async () => job)
    const response = await handleManifestationRequest(
      manifestationRequest("complete_108"),
      deps({
        triggerManifestationJob,
        reserveManifestationAttempt: vi.fn(async () => ({
          ok: false as const,
          status: 402 as const,
          error: "Payment required",
        })),
      }),
    )

    expect(response.status).toBe(402)
    expect(triggerManifestationJob).not.toHaveBeenCalled()
  })

  it("allows paid complete_108 requests and returns an async job", async () => {
    const triggerManifestationJob = vi.fn(async () => ({ ...job, payment_id: paymentId }))

    const response = await handleManifestationRequest(
      manifestationRequest("complete_108"),
      deps({
        triggerManifestationJob,
        reserveManifestationAttempt: vi.fn(async () => ({ ok: true as const, manifestationId, paymentId })),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(triggerManifestationJob).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ jobId: job.id, status: "processing" })
  })

  it("does not reuse a consumed complete_108 entitlement", async () => {
    const triggerManifestationJob = vi.fn(async () => job)
    const reserveManifestationAttempt = vi
      .fn()
      .mockResolvedValueOnce({ ok: true as const, manifestationId, paymentId })
      .mockResolvedValueOnce({ ok: false as const, status: 402 as const, error: "Payment required" })
    const sharedDeps = deps({ triggerManifestationJob, reserveManifestationAttempt })

    const first = await handleManifestationRequest(manifestationRequest("complete_108"), sharedDeps)
    const second = await handleManifestationRequest(manifestationRequest("complete_108"), sharedDeps)

    expect(first.status).toBe(202)
    expect(second.status).toBe(402)
    expect(triggerManifestationJob).toHaveBeenCalledTimes(1)
  })

  it("blocks default requests with no quota before calling Make", async () => {
    const triggerManifestationJob = vi.fn(async () => job)
    const response = await handleManifestationRequest(
      manifestationRequest("default"),
      deps({
        triggerManifestationJob,
        reserveManifestationAttempt: vi.fn(async () => ({
          ok: false as const,
          status: 403 as const,
          error: "Manifestation limit exceeded",
        })),
      }),
    )

    expect(response.status).toBe(403)
    expect(triggerManifestationJob).not.toHaveBeenCalled()
  })

  it("releases the reserved attempt when job trigger fails permanently", async () => {
    const releaseManifestationAttempt = vi.fn(async () => undefined)
    const response = await handleManifestationRequest(
      manifestationRequest("default"),
      deps({
        releaseManifestationAttempt,
        triggerManifestationJob: vi.fn(async () => ({ ...job, status: "failed" as const, error: "Make failed" })),
      }),
    )

    expect(response.status).toBe(502)
    expect(releaseManifestationAttempt).toHaveBeenCalledWith(
      userId,
      manifestationId,
      "Manifestation workflow failed",
    )
  })
})
