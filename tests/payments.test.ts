import { afterEach, describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"
import { validateCheckoutSession } from "@/lib/server/payments"

function checkoutSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    amount_total: 999,
    client_reference_id: "user_123",
    currency: "usd",
    metadata: {
      userId: "user_123",
      productId: "prod_Twmap5w4jDWJhi",
      action: "complete_108",
      expectedAmount: "999",
      expectedCurrency: "usd",
    },
    payment_intent: "pi_123",
    payment_status: "paid",
    ...overrides,
  } as Stripe.Checkout.Session
}

describe("validateCheckoutSession", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepts a paid session that matches user, product, amount, and currency", () => {
    expect(validateCheckoutSession(checkoutSession())).toEqual({
      ok: true,
      userId: "user_123",
      productId: "prod_Twmap5w4jDWJhi",
      action: "complete_108",
      amountTotal: 999,
      currency: "usd",
      paymentIntentId: "pi_123",
      stripePriceId: null,
    })
  })

  it("rejects ownership mismatches", () => {
    const result = validateCheckoutSession(checkoutSession({ client_reference_id: "other_user" }))
    expect(result).toEqual({ ok: false, reason: "Session user ownership mismatch" })
  })

  it("rejects amount tampering", () => {
    const result = validateCheckoutSession(checkoutSession({ amount_total: 199 }))
    expect(result).toEqual({ ok: false, reason: "Paid amount mismatch" })
  })

  it("rejects unpaid sessions", () => {
    const result = validateCheckoutSession(checkoutSession({ payment_status: "unpaid" }))
    expect(result).toEqual({ ok: false, reason: "Session is not paid" })
  })

  it("rejects a session whose Stripe Price ID does not match the configured product price", () => {
    vi.stubEnv("STRIPE_COMPLETE_108_PRICE_ID", "price_expected")

    const result = validateCheckoutSession(checkoutSession(), "price_wrong")
    expect(result).toEqual({ ok: false, reason: "Stripe price mismatch" })
  })
})
