# Monitoring Setup

## Sentry

Set these variables:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`

The app initializes Sentry through:

- `instrumentation.ts`
- `instrumentation-client.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

## Alerts

Create Sentry alert rules for captured messages containing:

- `Production alert: webhook_failure`
- `Production alert: make_failure`
- `Production alert: payment_fulfillment_failure`
- `Production alert: api_error`

Recommended actions:

- Page operator for payment fulfillment failures.
- Notify operations channel for webhook and Make failures.
- Create ticket for sustained API errors.

## Structured Logs

Server logs are JSON and include:

- `timestamp`
- `severity`
- `route`
- `requestId`
- `userId`

Use the `X-Request-Id` response header to correlate browser reports, server logs, and Sentry events.

