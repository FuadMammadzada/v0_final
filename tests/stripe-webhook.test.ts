import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Stripe webhook route", () => {
  const routeSource = fs.readFileSync(path.join(process.cwd(), "app/api/stripe/webhook/route.ts"), "utf8")
  const handlerSource = fs.readFileSync(path.join(process.cwd(), "lib/server/stripe-webhook-handler.ts"), "utf8")
  const paymentSource = fs.readFileSync(path.join(process.cwd(), "lib/server/payments.ts"), "utf8")
  const eventSource = fs.readFileSync(path.join(process.cwd(), "lib/server/webhook-events.ts"), "utf8")

  it("verifies signatures and validates line-item Price IDs before fulfillment", () => {
    expect(routeSource).toContain("webhooks.constructEvent")
    expect(routeSource).toContain('getRequiredEnv("STRIPE_WEBHOOK_SECRET")')
    expect(paymentSource).toContain("checkout.sessions.listLineItems")
    expect(handlerSource).toContain("fulfillCheckoutSession(session, priceId)")
  })

  it("tracks pending, processed, and failed webhook states for idempotent retries", () => {
    expect(eventSource).toContain('status: "pending"')
    expect(eventSource).toContain('data?.status === "processed"')
    expect(eventSource).toContain('status: "processed"')
    expect(eventSource).toContain('status: "failed"')
    expect(routeSource).toContain('decision === "already_processed"')
    expect(routeSource).toContain("markWebhookEventFailed")
  })
})
