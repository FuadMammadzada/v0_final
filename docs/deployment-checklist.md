# v0 Production Deployment Checklist

1. Apply both Supabase migrations to production.
2. Confirm RLS is enabled on every production table.
3. In v0 Project Menu `...` -> Environment Variables, configure every required variable for Production.
4. Publish once, then set `NEXT_PUBLIC_APP_URL`, `APP_URL`, and `ALLOWED_ORIGINS` to the stable v0 production or custom-domain URL and republish.
5. Add the production URL to Supabase Auth redirect URLs.
6. Configure the Stripe live webhook endpoint using the production URL.
7. Configure Make callback workflows using the production URL.
8. Connect or configure Upstash Redis in the v0 project.
9. Configure Sentry DSNs and alert rules.
10. Add admin users with `ADMIN_EMAILS` or `ADMIN_USER_IDS`.
11. Set a Production `CRON_SECRET`; `vercel.json` registers `/api/cron/manifestation-jobs` automatically on publish.
12. Run launch gates locally and in CI.
13. Publish the production version from v0.
14. Open `/admin` and verify readiness score is 100%.
15. Run a live low-value checkout and refund before accepting real users.

## v0 Cron

v0 deployments run on a linked Vercel project. The repository `vercel.json` creates this cron job during publish:

```text
GET /api/cron/manifestation-jobs
```

The configured schedule is every 5 minutes. Add `CRON_SECRET` to the v0 project's Production environment; the underlying Vercel Cron sends it as `Authorization: Bearer $CRON_SECRET`. The route also accepts `X-Cron-Secret` for manual operational checks.

Frequent cron schedules require an underlying Vercel plan that supports them. Vercel Hobby only permits daily cron execution, which is not sufficient for 15-minute job cleanup. Use a v0/Vercel project linked to a suitable paid Vercel plan, or replace this schedule with an external scheduler.

## v0 Environment Scope

- Production variables apply to the published application.
- Development variables apply to the v0 preview panel.
- Keep Supabase service-role, Stripe secret, Make webhook, callback, cron, Upstash, and Sentry server secrets out of `NEXT_PUBLIC_*` variables.
- After changing Production variables, republish so the new deployment receives them.
