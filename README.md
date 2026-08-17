# ManifestChain

ManifestChain is a Next.js app for authenticated manifestation searches, location-aware Make.com workflows, and paid extra attempts through Stripe Checkout.

## Stack

- Next.js App Router
- React 19
- Supabase Auth, Postgres, RLS, and RPC functions
- Stripe embedded Checkout and verified webhooks
- Make.com workflows behind server-side API proxies
- Optional OpenAI Responses API for fallback search/suggestion generation
- Vitest, TypeScript, ESLint, pnpm

## Local Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in real values.

3. Configure Supabase before starting the app:

   - Open the Supabase project linked to this deployment.
   - In **Project Settings → API**, copy the project URL into `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Add `SUPABASE_SERVICE_ROLE_KEY` only to server-side/Vercel environment variables. Never expose it through a `NEXT_PUBLIC_` variable or client component.
   - In **Authentication → URL Configuration**, add the deployed app URL and the local URL (`http://localhost:3000`) to the allowed redirect URLs.

4. Run the Supabase schema migration:

   - Open the Supabase SQL Editor.
   - Run `supabase/migrations/0001_initial_schema.sql` once.
   - Confirm these tables exist: `user_profiles`, `manifestations`, `payments`, `webhook_events`.
   - Confirm RLS is enabled for every user-data table and that policies scope rows to the authenticated user with `auth.uid()`.
   - Do not disable RLS to resolve an access error; fix the policy or Data API grants instead.

5. Verify the database setup:

   - Create a test account through the app and confirm a `user_profiles` row is created.
   - Create a test manifestation and confirm it is scoped to that user.
   - Verify another authenticated user cannot read or update the first user’s profile, manifestations, or payments.
   - Run the app’s typecheck and tests before deploying.

6. Start the app:

   ```bash
   pnpm dev
   ```

## Required Environment

Use `.env.example` as the source of truth. Real secrets should be added in `.env.local` for local development and in the v0/Vercel project Environment Variables for deployment. Do not commit real secret values.

Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Stripe:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_COMPLETE_108_PRICE_ID`
- `STRIPE_ONE_MORE_TRY_PRICE_ID`

Make.com:

- `MAKE_MANIFESTATION_WEBHOOK_URL`
- `MAKE_COMPLETE_108_WEBHOOK_URL`
- `MAKE_MESSAGES_WEBHOOK_URL`
- `MAKE_SUGGESTIONS_WEBHOOK_URL`
- `MAKE_CALLBACK_SECRET`

App/runtime:

- `APP_ENV`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `ALLOWED_ORIGINS`
- `CRON_SECRET`

Admin:

- `ADMIN_EMAILS` or `ADMIN_USER_IDS`

Monitoring:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE`

Required in production for shared rate limiting:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_SEARCH_MODEL`
- `OPENAI_SUGGESTIONS_MODEL`
- `FORMSPREE_ENDPOINT`

## Stripe Setup

1. Create Stripe Prices for:
   - Complete 108 Arcs Guarantee
   - One More Try

2. Put those Price IDs in:
   - `STRIPE_COMPLETE_108_PRICE_ID`
   - `STRIPE_ONE_MORE_TRY_PRICE_ID`

3. Configure a webhook endpoint:

   ```text
   https://your-domain.com/api/stripe/webhook
   ```

4. Subscribe at minimum to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`

5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

Paid entitlement must only be granted by `/api/stripe/webhook`. The deleted legacy `/api/payment-success` route must not be recreated.

## Supabase Setup

Run `supabase/migrations/0001_initial_schema.sql`. The migration creates:

- RLS-protected `user_profiles`
- RLS-protected `manifestations`
- RLS-protected `payments`
- private `webhook_events`
- indexes for user/time access patterns
- non-negative quota constraints
- `reserve_manifestation_attempt()`, `finalize_manifestation_attempt()`, and `release_manifestation_attempt()` for server-side quota and paid entitlement usage
- `fulfill_paid_payment()` for idempotent Stripe fulfillment

The app uses the service-role key only from trusted server-side routes.

## Verification

Run the full production gate locally:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --prod
```

## Deployment

The app is Vercel-ready once all required environment variables are configured. Use Upstash Redis in production for shared rate limiting across serverless instances; otherwise the app falls back to per-instance in-memory limits for local development only.

Before production traffic:

- Deploy Supabase migration.
- Configure Stripe webhook endpoint and signing secret.
- Configure Make.com webhook URLs only as server env vars.
- Verify Supabase email and Google OAuth redirect URLs include your production domain.
- Run the CI workflow or the local verification commands above.
