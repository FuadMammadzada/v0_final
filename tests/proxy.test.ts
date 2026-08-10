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

  it("uses forwarded deployment headers when v0 proxies the request", () => {
    const request = new NextRequest("http://internal-preview/api/make/suggestions", {
      method: "POST",
      headers: {
        origin: "https://vm-new-chat.vusercontent.net",
        "x-forwarded-host": "vm-new-chat.vusercontent.net",
        "x-forwarded-proto": "https",
      },
    })

    expect(proxy(request).status).not.toBe(403)
  })

  it("accepts browser-confirmed same-origin v0 preview requests", () => {
    const request = new NextRequest("http://internal-preview/api/make/suggestions", {
      method: "POST",
      headers: {
        origin: "https://vm-new-chat.vusercontent.net",
        "sec-fetch-site": "same-origin",
      },
    })

    expect(proxy(request).status).not.toBe(403)
  })

  it("allows a v0 preview when TLS is terminated before Next.js", () => {
    const request = new NextRequest("http://vm-new-chat.vusercontent.net/api/make/suggestions", {
      method: "POST",
      headers: { origin: "https://vm-new-chat.vusercontent.net" },
    })

    expect(proxy(request).status).not.toBe(403)
  })

  it("accepts browser-confirmed same-origin v0.build requests behind the internal proxy", () => {
    const request = new NextRequest("http://internal-preview/api/make/manifestation", {
      method: "POST",
      headers: {
        origin: "https://manifestation-tracker.v0.build",
        "sec-fetch-site": "same-origin",
      },
    })

    expect(proxy(request).status).not.toBe(403)
  })

  it("uses forwarded deployment headers for v0.build", () => {
    const request = new NextRequest("http://internal-preview/api/make/manifestation", {
      method: "POST",
      headers: {
        origin: "https://manifestation-tracker.v0.build",
        "x-forwarded-host": "manifestation-tracker.v0.build",
        "x-forwarded-proto": "https",
      },
    })

    expect(proxy(request).status).not.toBe(403)
  })

  it("does not treat a different v0 preview host as same-origin", () => {
    const request = new NextRequest("https://vm-manifestation-tracker.vusercontent.net/api/make/suggestions", {
      method: "POST",
      headers: { origin: "https://vm-untrusted-preview.vusercontent.net" },
    })

    expect(proxy(request).status).toBe(403)
  })

  it("does not treat a different v0.build host as same-origin", () => {
    const request = new NextRequest("https://manifestation-tracker.v0.build/api/make/manifestation", {
      method: "POST",
      headers: { origin: "https://untrusted-preview.v0.build" },
    })

    expect(proxy(request).status).toBe(403)
  })

  it("blocks an unconfigured cross-origin request", () => {
    const request = new NextRequest("https://preview.vusercontent.net/api/make/suggestions", {
      method: "POST",
      headers: { origin: "https://untrusted.example" },
    })

    expect(proxy(request).status).toBe(403)
  })
})
