import "server-only"

import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { fulfillCheckoutSession } from "./payments"
import { createSupabaseAdminClient } from "./supabase"

export class WebhookRejectedError extends Error {
  status = 400
}

async function markCheckoutSessionStatus(session: Stripe.Checkout.Session, status: string) {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from("payments")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id)
}

async function getCheckoutSessionPriceId(sessionId: string): Promise<string | null> {
  const lineItems = await getStripe().checkout.sessions.listLineItems(sessionId, {
    expand: ["data.price"],
    limit: 2,
  })

  if (lineItems.data.length !== 1) {
    return null
  }

  const price = lineItems.data[0]?.price
  return typeof price === "string" ? price : price?.id ?? null
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const eventSession = event.data.object as Stripe.Checkout.Session
      const session = await getStripe().checkout.sessions.retrieve(eventSession.id)
      const priceId = await getCheckoutSessionPriceId(session.id)
      const result = await fulfillCheckoutSession(session, priceId)
      if (!result.ok) {
        throw new WebhookRejectedError("Webhook fulfillment rejected")
      }
      break
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session
      await markCheckoutSessionStatus(session, event.type === "checkout.session.expired" ? "expired" : "failed")
      break
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const supabase = createSupabaseAdminClient()
      await supabase
        .from("payments")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", paymentIntent.id)
      break
    }
    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const supabase = createSupabaseAdminClient()
      await supabase
        .from("payments")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", paymentIntent.id)
      break
    }
    default:
      break
  }
}
