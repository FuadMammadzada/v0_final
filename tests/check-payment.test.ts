import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { checkoutSessionBelongsToUser, getCheckoutSessionId } from "@/lib/server/check-payment"

describe("check-payment helpers", () => {
  const routeSource = fs.readFileSync(path.join(process.cwd(), "app/api/check-payment/route.ts"), "utf8")
  const recoverySource = fs.readFileSync(
    path.join(process.cwd(), "app/api/check-payment/recover/route.ts"),
    "utf8",
  )

  it("extracts the Checkout Session ID from a Stripe client secret", () => {
    expect(getCheckoutSessionId("cs_test_abc_secret_xyz")).toBe("cs_test_abc")
  })

  it("rejects malformed client secrets", () => {
    expect(getCheckoutSessionId("pi_test_abc_secret_xyz")).toBeNull()
    expect(getCheckoutSessionId("cs_test_abc")).toBeNull()
  })

  it("requires both client_reference_id and metadata.userId to match the authenticated user", () => {
    expect(
      checkoutSessionBelongsToUser(
        {
          client_reference_id: "user_123",
          metadata: { userId: "user_123" },
        },
        "user_123",
      ),
    ).toBe(true)

    expect(
      checkoutSessionBelongsToUser(
        {
          client_reference_id: "user_123",
          metadata: { userId: "other_user" },
        },
        "user_123",
      ),
    ).toBe(false)
  })

  it("activates paid sessions when the Stripe webhook has not fulfilled them yet", () => {
    expect(routeSource).toContain('session.payment_status === "paid"')
    expect(routeSource).toContain("getCheckoutSessionPriceId(session.id)")
    expect(routeSource).toContain("fulfillCheckoutSession(session, priceId)")
    expect(routeSource.match(/paymentResult = await readPayment\(\)/g)).toHaveLength(2)
  })

  it("recovers an existing unconsumed premium entitlement after reload", () => {
    expect(recoverySource).toContain('.eq("action", "complete_108")')
    expect(recoverySource).toContain('.is("entitlement_consumed_at", null)')
    expect(recoverySource).toContain("fulfillCheckoutSession(session, priceId)")
    expect(recoverySource).toContain('action: "complete_108"')
  })
})
