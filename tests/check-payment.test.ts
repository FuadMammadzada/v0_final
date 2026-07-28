import { describe, expect, it } from "vitest"
import { checkoutSessionBelongsToUser, getCheckoutSessionId } from "@/lib/server/check-payment"

describe("check-payment helpers", () => {
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
})
