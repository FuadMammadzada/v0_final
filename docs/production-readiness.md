# Production Readiness Checklist

## Environment

- `APP_ENV=production` or `VERCEL_ENV=production`.
- `NEXT_PUBLIC_APP_URL` is the canonical HTTPS URL.
- `ALLOWED_ORIGINS` includes the canonical HTTPS URL and no wildcard origins.
- `ADMIN_EMAILS` or `ADMIN_USER_IDS` contains at least one launch operator.
- Variables are entered in the v0 project's Production environment, not only in the preview/Development scope.

## Supabase

- Production project created.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` configured.
- `supabase/migrations/0001_initial_schema.sql` applied cleanly.
- RLS enabled on customer, payment, webhook, job, and audit tables.
- Point-in-time recovery enabled on the Supabase plan.
- Daily backups monitored through `backup_runs` or Supabase backup notifications.

## Stripe

- Live-mode `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`.
- Live-mode `STRIPE_SECRET_KEY` starts with `sk_live_`.
- Webhook endpoint configured: `https://your-domain.com/api/stripe/webhook`.
- `STRIPE_WEBHOOK_SECRET` starts with `whsec_`.
- `STRIPE_COMPLETE_108_PRICE_ID` and `STRIPE_ONE_MORE_TRY_PRICE_ID` are live `price_` IDs.
- Stripe events enabled: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.

## Upstash

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` configured.
- Production route rate limiting is fail-closed when Upstash is unavailable.

## Make.com

- Manifestation, complete 108, messages, and suggestions webhook URLs configured.
- Make workflows accept `jobId`, `callbackUrl`, and `callbackSecret`.
- Make calls back to `/api/make/manifestation/callback` with `x-make-callback-secret`.
- Make workflows are configured to return quickly after accepting the job.
- `vercel.json` registers `/api/cron/manifestation-jobs` every 5 minutes when v0 publishes the linked Vercel project.
- The linked Vercel plan supports a 5-minute cron frequency; Hobby's daily cron limit is not production-safe for this workflow.

## Monitoring

- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` configured.
- Sentry alerts configured for `webhook_failure`, `make_failure`, `payment_fulfillment_failure`, and `api_error`.
- Sentry Replay sample rates default to `0`; browser replay only samples after stored analytics consent is present.
- Admin dashboard checked at `/admin`.

## Launch Gates

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
pnpm audit --prod
```
