import * as Sentry from "@sentry/nextjs"

function analyticsConsentGranted() {
  if (typeof window === "undefined") return false

  try {
    const consent = JSON.parse(localStorage.getItem("manifestchain_cookie_consent") ?? "{}") as {
      analytics?: boolean
    }
    return consent.analytics === true
  } catch {
    return false
  }
}

const replayAllowed = analyticsConsentGranted()

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.APP_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
  replaysSessionSampleRate: replayAllowed ? Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE ?? "0") : 0,
  replaysOnErrorSampleRate: replayAllowed ? Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE ?? "0") : 0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
