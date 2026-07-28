import { NextResponse } from "next/server"
import { z } from "zod"
import { getStripe } from "@/lib/stripe"
import { getProduct } from "@/lib/products"
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth"
import { getAppUrl, getOptionalEnv } from "@/lib/server/env"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody } from "@/lib/server/request"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

const checkoutSchema = z.object({
  productId: z.string().trim().min(1).max(100),
})

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "stripe-checkout",
    limit: 10,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const auth = await authenticateRequest(request)
  if (!auth) {
    return unauthorizedResponse()
  }

  const parsed = await parseJsonBody(request, checkoutSchema, { maxBytes: 1024 })
  if (!parsed.ok) return parsed.response

  const product = getProduct(parsed.data.productId)
  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 })
  }

  const appUrl = getAppUrl()
  const stripe = getStripe()
  const priceId = getOptionalEnv(product.priceEnvVar)

  if (process.env.NODE_ENV === "production" && !priceId) {
    return NextResponse.json({ error: "Payment product is not configured" }, { status: 500 })
  }

  const lineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description,
            metadata: {
              productId: product.id,
            },
          },
          unit_amount: product.priceInCents,
        },
        quantity: 1,
      }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    redirect_on_completion: "never",
    line_items: [lineItem],
    mode: "payment",
    client_reference_id: auth.user.id,
    return_url: `${appUrl}/?checkout_session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      userId: auth.user.id,
      productId: product.id,
      action: product.action,
      expectedAmount: String(product.priceInCents),
      expectedCurrency: "usd",
    },
  })

  if (!session.client_secret) {
    return NextResponse.json({ error: "Checkout session unavailable" }, { status: 502 })
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("payments").upsert(
    {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_price_id: priceId ?? null,
      user_id: auth.user.id,
      product_id: product.id,
      action: product.action,
      amount_total: product.priceInCents,
      currency: "usd",
      status: session.payment_status ?? "unpaid",
      fulfilled_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_checkout_session_id" },
  )

  if (error) {
    return NextResponse.json({ error: "Unable to create payment record" }, { status: 500 })
  }

  return NextResponse.json({ clientSecret: session.client_secret })
}
