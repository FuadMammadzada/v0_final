import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "../proxy"

describe("API origin protection", () => {
  it("allows requests from the deployment's own origin", () => {
    const request = new NextRequest("https://preview.vusercontent.net/api/make/suggestions", {
      method: "POST",
      headers: { origin: "https://preview.vusercontent.net" },
    })

    expect(proxy(request).status).not.toBe(403)
  })

  it("blocks an unconfigured cross-origin request", () => {
    const request = new NextRequest("https://preview.vusercontent.net/api/make/suggestions", {
      method: "POST",
      headers: { origin: "https://untrusted.example" },
    })

    expect(proxy(request).status).toBe(403)
  })
})
