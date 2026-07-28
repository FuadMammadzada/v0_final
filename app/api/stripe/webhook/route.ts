import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { getRequiredEnv } from "@/lib/server/env"
import { createRequestLogContext } from "@/lib/server/logger"
import { captureServerError, emitAlert } from "@/lib/server/monitoring"
import { handleStripeEvent, WebhookRejectedError } from "@/lib/server/stripe-webhook-handler"
import { beginWebhookEvent, markWebhookEventFailed, markWebhookEventProcessed } from "@/lib/server/webhook-events"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const context = createRequestLogContext(request, "/api/stripe/webhook")
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    emitAlert("api_error", context, { area: "stripe_signature_missing" })
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  const payload = await request.text()
  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(payload, signature, getRequiredEnv("STRIPE_WEBHOOK_SECRET"))
  } catch {
    emitAlert("api_error", context, { area: "stripe_signature_invalid" })
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 })
  }

  try {
    const decision = await beginWebhookEvent(event)
    if (decision === "already_processed") {
      return NextResponse.json({ received: true, duplicate: true })
    }

    await handleStripeEvent(event)
    await markWebhookEventProcessed(event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    await markWebhookEventFailed(event.id, error).catch(() => undefined)
    captureServerError(error, context, { area: "stripe_webhook", eventType: event.type })
    emitAlert(error instanceof WebhookRejectedError ? "payment_fulfillment_failure" : "webhook_failure", context, {
      eventId: event.id,
      eventType: event.type,
    })
    return NextResponse.json(
      { error: error instanceof WebhookRejectedError ? error.message : "Webhook processing failed" },
      { status: error instanceof WebhookRejectedError ? error.status : 500 },
    )
  }
}
