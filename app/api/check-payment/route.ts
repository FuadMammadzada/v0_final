import { NextResponse } from "next/server"
import { z } from "zod"
import { getStripe } from "@/lib/stripe"
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth"
import { checkoutSessionBelongsToUser, getCheckoutSessionId } from "@/lib/server/check-payment"
import { fulfillCheckoutSession, getCheckoutSessionPriceId } from "@/lib/server/payments"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody } from "@/lib/server/request"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

const checkPaymentSchema = z.object({
  clientSecret: z.string().trim().min(20).max(500),
})

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "check-payment",
    limit: 30,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const auth = await authenticateRequest(request)
  if (!auth) {
    return unauthorizedResponse()
  }

  const parsed = await parseJsonBody(request, checkPaymentSchema, { maxBytes: 1024 })
  if (!parsed.ok) return parsed.response

  const sessionId = getCheckoutSessionId(parsed.data.clientSecret)
  if (!sessionId) {
    return NextResponse.json({ error: "Invalid checkout session" }, { status: 400 })
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (!checkoutSessionBelongsToUser(session, auth.user.id)) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 })
  }

  const supabase = createSupabaseAdminClient()
  const readPayment = () =>
    supabase
      .from("payments")
      .select("action, fulfilled_at, status")
      .eq("stripe_checkout_session_id", session.id)
      .eq("user_id", auth.user.id)
      .maybeSingle()

  let paymentResult = await readPayment()
  if (paymentResult.error) {
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 500 })
  }

  if (session.payment_status === "paid" && !paymentResult.data?.fulfilled_at) {
    const priceId = await getCheckoutSessionPriceId(session.id)
    const fulfillment = await fulfillCheckoutSession(session, priceId)

    if (!fulfillment.ok) {
      return NextResponse.json({ error: "Unable to activate payment" }, { status: 502 })
    }

    // The RPC is idempotent. Re-read the payment so a concurrent webhook
    // fulfillment and this authenticated fallback produce the same response.
    paymentResult = await readPayment()
    if (paymentResult.error) {
      return NextResponse.json({ error: "Unable to verify payment" }, { status: 500 })
    }
  }

  const fulfilled = Boolean(paymentResult.data?.fulfilled_at)

  return NextResponse.json({
    status: session.payment_status,
    sessionStatus: session.status,
    fulfilled,
    action: fulfilled ? paymentResult.data?.action : null,
  })
}
