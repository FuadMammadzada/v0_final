import "server-only"

import { z } from "zod"

type ChecklistItem = {
  name: string
  ok: boolean
  detail: string
}

const urlSchema = z.string().url()

const requiredProductionEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_COMPLETE_108_PRICE_ID",
  "STRIPE_ONE_MORE_TRY_PRICE_ID",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "MAKE_MANIFESTATION_WEBHOOK_URL",
  "MAKE_COMPLETE_108_WEBHOOK_URL",
  "MAKE_MESSAGES_WEBHOOK_URL",
  "MAKE_SUGGESTIONS_WEBHOOK_URL",
  "MAKE_CALLBACK_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "ALLOWED_ORIGINS",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const

function isStrictProduction() {
  return process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production"
}

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim())
}

function validUrl(name: string) {
  const value = process.env[name]
  return Boolean(value && urlSchema.safeParse(value).success)
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getProductionReadinessChecklist(): ChecklistItem[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const origins = allowedOrigins()

  return [
    {
      name: "Supabase production database",
      ok:
        validUrl("NEXT_PUBLIC_SUPABASE_URL") &&
        hasValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
        hasValue("SUPABASE_SERVICE_ROLE_KEY"),
      detail: "Supabase URL, anon key, and service role key are configured.",
    },
    {
      name: "Stripe production keys",
      ok:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_") === true &&
        process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") === true,
      detail: "Stripe publishable and secret keys should use live-mode prefixes in production.",
    },
    {
      name: "Stripe webhook endpoint",
      ok: process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") === true,
      detail: "Stripe webhook signing secret is configured.",
    },
    {
      name: "Stripe price IDs",
      ok:
        process.env.STRIPE_COMPLETE_108_PRICE_ID?.startsWith("price_") === true &&
        process.env.STRIPE_ONE_MORE_TRY_PRICE_ID?.startsWith("price_") === true,
      detail: "Both paid products have Stripe Price IDs.",
    },
    {
      name: "Upstash Redis",
      ok: validUrl("UPSTASH_REDIS_REST_URL") && hasValue("UPSTASH_REDIS_REST_TOKEN"),
      detail: "Distributed rate limiting is configured.",
    },
    {
      name: "Make.com webhooks",
      ok:
        validUrl("MAKE_MANIFESTATION_WEBHOOK_URL") &&
        validUrl("MAKE_COMPLETE_108_WEBHOOK_URL") &&
        validUrl("MAKE_MESSAGES_WEBHOOK_URL") &&
        validUrl("MAKE_SUGGESTIONS_WEBHOOK_URL") &&
        hasValue("MAKE_CALLBACK_SECRET"),
      detail: "All Make workflows and callback secret are configured.",
    },
    {
      name: "Cron job protection",
      ok: hasValue("CRON_SECRET"),
      detail: "Server-side maintenance routes require a shared cron secret.",
    },
    {
      name: "App URL configuration",
      ok: validUrl("NEXT_PUBLIC_APP_URL"),
      detail: "Canonical public app URL is configured.",
    },
    {
      name: "CORS and allowed origins",
      ok: Boolean(appUrl && origins.includes(appUrl)),
      detail: "ALLOWED_ORIGINS includes NEXT_PUBLIC_APP_URL.",
    },
    {
      name: "Admin access",
      ok: hasValue("ADMIN_EMAILS") || hasValue("ADMIN_USER_IDS"),
      detail: "At least one admin identity is configured.",
    },
    {
      name: "Sentry monitoring",
      ok: validUrl("SENTRY_DSN") && validUrl("NEXT_PUBLIC_SENTRY_DSN"),
      detail: "Server and browser Sentry DSNs are configured.",
    },
  ]
}

export function validateProductionEnvironment() {
  if (!isStrictProduction()) {
    return
  }

  const missing = requiredProductionEnv.filter((name) => !hasValue(name))
  const failed = getProductionReadinessChecklist().filter((item) => !item.ok)

  if (missing.length > 0 || failed.length > 0) {
    throw new Error(
      [
        "Production startup validation failed.",
        missing.length > 0 ? `Missing: ${missing.join(", ")}` : null,
        failed.length > 0 ? `Failed checks: ${failed.map((item) => item.name).join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" "),
    )
  }
}
