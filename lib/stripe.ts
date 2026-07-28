import 'server-only'

import Stripe from 'stripe'
import { getRequiredEnv } from './server/env'

let stripeClient: Stripe | null = null

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'))
  }

  return stripeClient
}
