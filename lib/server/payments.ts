import "server-only"

import type Stripe from "stripe"
import { getProduct, type ProductAction } from "@/lib/products"
import { getOptionalEnv } from "./env"
import { createSupabaseAdminClient } from "./supabase"

export type CheckoutSessionValidation =
  | {
      ok: true
      userId: string
      productId: string
      action: ProductAction
      amountTotal: number
      currency: string
      paymentIntentId: string | null
      stripePriceId: string | null
    }
  | { ok: false; reason: string }

export function validateCheckoutSession(
  session: Stripe.Checkout.Session,
  stripePriceId: string | null = null,
): CheckoutSessionValidation {
  const userId = session.metadata?.userId
  const productId = session.metadata?.productId
  const action = session.metadata?.action as ProductAction | undefined
  const expectedAmount = Number(session.metadata?.expectedAmount)
  const expectedCurrency = session.metadata?.expectedCurrency ?? "usd"
  const product = productId ? getProduct(productId) : null

  if (!userId || session.client_reference_id !== userId) {
    return { ok: false, reason: "Session user ownership mismatch" }
  }

  if (!product || product.action !== action) {
    return { ok: false, reason: "Session product metadata mismatch" }
  }

  if (!Number.isFinite(expectedAmount) || expectedAmount !== product.priceInCents) {
    return { ok: false, reason: "Session expected amount mismatch" }
  }

  if (session.amount_total !== product.priceInCents) {
    return { ok: false, reason: "Paid amount mismatch" }
  }

  if (session.currency !== expectedCurrency || session.currency !== "usd") {
    return { ok: false, reason: "Currency mismatch" }
  }

  if (session.payment_status !== "paid") {
    return { ok: false, reason: "Session is not paid" }
  }

  const configuredPriceId = getOptionalEnv(product.priceEnvVar)
  if (process.env.NODE_ENV === "production" && !configuredPriceId) {
    return { ok: false, reason: "Configured Stripe price missing" }
  }

  if (configuredPriceId && stripePriceId !== configuredPriceId) {
    return { ok: false, reason: "Stripe price mismatch" }
  }

  return {
    ok: true,
    userId,
    productId: product.id,
    action: product.action,
    amountTotal: product.priceInCents,
    currency: "usd",
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripePriceId,
  }
}

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session, stripePriceId: string | null) {
  const validation = validateCheckoutSession(session, stripePriceId)
  if (!validation.ok) {
    return validation
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc("fulfill_paid_payment", {
    p_stripe_checkout_session_id: session.id,
    p_stripe_payment_intent_id: validation.paymentIntentId,
    p_user_id: validation.userId,
    p_product_id: validation.productId,
    p_action: validation.action,
    p_amount_total: validation.amountTotal,
    p_currency: validation.currency,
    p_stripe_price_id: validation.stripePriceId,
  })

  if (error) {
    return { ok: false as const, reason: "Payment fulfillment failed" }
  }

  return { ok: true as const, fulfilled: Boolean(data) }
}
