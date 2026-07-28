import { describe, expect, it } from "vitest"
import { z } from "zod"
import { parseJsonBody, querySchema } from "@/lib/server/request"

describe("parseJsonBody", () => {
  it("returns typed data for valid JSON", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ query: "manifest clarity" }),
    })

    const result = await parseJsonBody(request, z.object({ query: querySchema }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.query).toBe("manifest clarity")
    }
  })

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "{not-json",
    })

    const result = await parseJsonBody(request, z.object({ query: querySchema }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
    }
  })

  it("rejects oversized bodies before validation", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ query: "a".repeat(100) }),
    })

    const result = await parseJsonBody(request, z.object({ query: querySchema }), { maxBytes: 20 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(413)
    }
  })
})
