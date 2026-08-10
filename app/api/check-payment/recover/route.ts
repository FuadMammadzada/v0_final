import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth"
import { checkoutSessionBelongsToUser } from "@/lib/server/check-payment"
import { fulfillCheckoutSession, getCheckoutSessionPriceId } from "@/lib/server/payments"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "recover-payment-entitlement",
    limit: 10,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const auth = await authenticateRequest(request)
  if (!auth) {
    return unauthorizedResponse()
  }

  const supabase = createSupabaseAdminClient()
  const readEntitlement = () =>
    supabase
      .from("payments")
      .select("stripe_checkout_session_id, fulfilled_at, entitlement_consumed_at")
      .eq("user_id", auth.user.id)
      .eq("action", "complete_108")
      .is("entitlement_consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

  let paymentResult = await readEntitlement()
  if (paymentResult.error) {
    return NextResponse.json({ error: "Unable to recover payment" }, { status: 500 })
  }

  if (!paymentResult.data) {
    return NextResponse.json({ action: null })
  }

  if (!paymentResult.data.fulfilled_at) {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(paymentResult.data.stripe_checkout_session_id)

    if (!checkoutSessionBelongsToUser(session, auth.user.id)) {
      return NextResponse.json({ error: "Checkout session not found" }, { status: 404 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ action: null })
    }

    const priceId = await getCheckoutSessionPriceId(session.id)
    const fulfillment = await fulfillCheckoutSession(session, priceId)
    if (!fulfillment.ok) {
      return NextResponse.json({ error: "Unable to activate payment" }, { status: 502 })
    }

    paymentResult = await readEntitlement()
    if (paymentResult.error || !paymentResult.data?.fulfilled_at) {
      return NextResponse.json({ error: "Unable to recover payment" }, { status: 500 })
    }
  }

  return NextResponse.json({ action: "complete_108" })
}
