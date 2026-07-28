import { NextResponse } from "next/server"
import { z } from "zod"
import { getStripe } from "@/lib/stripe"
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth"
import { checkoutSessionBelongsToUser, getCheckoutSessionId } from "@/lib/server/check-payment"
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

  const session = await getStripe().checkout.sessions.retrieve(sessionId)

  if (!checkoutSessionBelongsToUser(session, auth.user.id)) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: payment } = await supabase
    .from("payments")
    .select("action, fulfilled_at, status")
    .eq("stripe_checkout_session_id", session.id)
    .eq("user_id", auth.user.id)
    .maybeSingle()

  const fulfilled = Boolean(payment?.fulfilled_at)

  return NextResponse.json({
    status: session.payment_status,
    sessionStatus: session.status,
    fulfilled,
    action: fulfilled ? payment?.action : null,
  })
}
