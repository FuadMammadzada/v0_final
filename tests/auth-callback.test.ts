import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("auth callback page", () => {
  it("uses the guarded token helper and relative redirects", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/auth/callback/page.tsx"), "utf8")

    expect(source).toContain('import { getAccessToken } from "@/lib/supabase"')
    expect(source).toContain("await getAccessToken()")
    expect(source).toContain('router.replace("/?error=auth_error")')
    expect(source).not.toContain("https://manifestchain.space")
  })
})
