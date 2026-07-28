# Stripe Setup

Stripe fulfillment is webhook-only. Do not grant paid attempts from browser redirects, query parameters, or public success routes.

## Required Environment

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_COMPLETE_108_PRICE_ID`
- `STRIPE_ONE_MORE_TRY_PRICE_ID`

## Checkout Flow

1. Authenticated client calls `POST /api/stripe/checkout` with `productId`.
2. The server authenticates the Supabase bearer token.
3. The server creates an embedded Checkout Session with:
   - `client_reference_id`
   - `metadata.userId`
   - `metadata.productId`
   - `metadata.action`
   - expected amount and currency metadata
4. The server stores a pending row in `payments`.
5. The client polls `POST /api/check-payment`, which verifies the Stripe session belongs to the authenticated user.
6. The client only proceeds when the webhook has fulfilled the payment and `payments.fulfilled_at` is set.

## Webhook Flow

Configure this endpoint in Stripe:

```text
https://your-domain.com/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

The webhook verifies `stripe-signature`, records events as `pending`, marks successful work as `processed`, keeps failures as `failed` for retry, validates amount/currency/product/user ownership and Stripe Price ID, and calls `fulfill_paid_payment()` in Supabase.

## Local Testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the listener `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

Use Stripe test card `4242 4242 4242 4242` with any valid future expiry and CVC.
