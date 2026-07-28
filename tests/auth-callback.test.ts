import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("auth callback page", () => {
  it("guards against missing Supabase configuration and uses relative redirects", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/auth/callback/page.tsx"), "utf8")

    expect(source).toContain("if (!supabase)")
    expect(source).toContain('router.replace("/?error=auth_error")')
    expect(source).not.toContain("https://manifestchain.space")
  })
})
