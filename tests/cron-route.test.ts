import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const cronRouteSource = fs.readFileSync(
  path.join(process.cwd(), "app/api/cron/manifestation-jobs/route.ts"),
  "utf8",
)

describe("manifestation job cron route", () => {
  it("requires a cron secret and runs the stale job processor", () => {
    expect(cronRouteSource).toContain('getRequiredEnv("CRON_SECRET")')
    expect(cronRouteSource).toContain("Bearer ${expected}")
    expect(cronRouteSource).toContain('request.headers.get("x-cron-secret")')
    expect(cronRouteSource).toContain("processStaleManifestationJobs")
  })
})
