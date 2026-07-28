import { beforeEach, describe, expect, it, vi } from "vitest"
import { checkRateLimit, resetLocalRateLimitForTests } from "@/lib/server/rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    resetLocalRateLimitForTests()
  })

  it("allows requests up to the limit and rejects the next one", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    })

    await expect(checkRateLimit(request, { key: "test", limit: 1, windowMs: 60_000 })).resolves.toBeNull()

    const blocked = await checkRateLimit(request, { key: "test", limit: 1, windowMs: 60_000 })
    expect(blocked?.status).toBe(429)
  })

  it("fails closed for distributed-only production routes when Upstash is missing", async () => {
    vi.stubEnv("NODE_ENV", "production")

    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.11",
      },
    })

    const blocked = await checkRateLimit(request, {
      key: "costly",
      limit: 1,
      windowMs: 60_000,
      requireDistributed: true,
    })

    expect(blocked?.status).toBe(503)
  })
})
