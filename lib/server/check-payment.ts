import type Stripe from "stripe"

export function getCheckoutSessionId(clientSecret: string): string | null {
  const parts = clientSecret.split("_secret_")
  if (parts.length !== 2) {
    return null
  }

  const [sessionId] = parts
  return sessionId?.startsWith("cs_") ? sessionId : null
}

export function checkoutSessionBelongsToUser(
  session: Pick<Stripe.Checkout.Session, "client_reference_id" | "metadata">,
  userId: string,
) {
  return session.client_reference_id === userId && session.metadata?.userId === userId
}
