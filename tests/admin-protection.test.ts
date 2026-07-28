import fs from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createAdminSessionToken, verifyAdminSessionToken } from "@/lib/server/admin-session"

const adminPageSource = fs.readFileSync(path.join(process.cwd(), "app/admin/page.tsx"), "utf8")
const adminGateSource = fs.readFileSync(path.join(process.cwd(), "components/admin/admin-gate.tsx"), "utf8")

describe("admin shell protection", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("does not statically render or import the dashboard shell for unverified requests", () => {
    expect(adminPageSource).toContain("verifyAdminSessionToken")
    expect(adminPageSource).not.toContain('import AdminDashboard from "@/components/admin/admin-dashboard"')
    expect(adminPageSource).toContain('await import("@/components/admin/admin-dashboard")')
    expect(adminGateSource).toContain("/api/admin/readiness")
    expect(adminGateSource).toContain("/api/admin/session")
    expect(adminGateSource).not.toContain("admin-dashboard")
  })

  it("signs short-lived admin page sessions and rejects tampering, expiry, and removed admins", () => {
    const now = new Date("2026-06-08T12:00:00.000Z").getTime()
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-admin-cookie-secret")
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com")
    vi.stubEnv("ADMIN_USER_IDS", "")

    const token = createAdminSessionToken({ id: "00000000-0000-4000-8000-000000000001", email: "admin@example.com" }, now)
    expect(verifyAdminSessionToken(token, now)).toMatchObject({
      userId: "00000000-0000-4000-8000-000000000001",
      email: "admin@example.com",
    })
    expect(verifyAdminSessionToken(`${token.slice(0, -1)}x`, now)).toBeNull()
    expect(verifyAdminSessionToken(token, now + 31 * 60_000)).toBeNull()

    vi.stubEnv("ADMIN_EMAILS", "other@example.com")
    expect(verifyAdminSessionToken(token, now)).toBeNull()
  })
})
