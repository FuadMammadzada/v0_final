import "server-only"

import * as Sentry from "@sentry/nextjs"
import type { RequestLogContext } from "./logger"
import { logError, logEvent } from "./logger"

type AlertType = "webhook_failure" | "make_failure" | "payment_fulfillment_failure" | "api_error"

export function captureServerError(error: unknown, context: RequestLogContext, tags: Record<string, string> = {}) {
  logError("Server error captured", context, error, { tags })
  Sentry.captureException(error, {
    tags: {
      route: context.route,
      requestId: context.requestId,
      userId: context.userId ?? "anonymous",
      ...tags,
    },
  })
}

export function emitAlert(type: AlertType, context: RequestLogContext, fields: Record<string, unknown> = {}) {
  logEvent("error", `Production alert: ${type}`, context, {
    alertType: type,
    ...fields,
  })
  Sentry.captureMessage(`Production alert: ${type}`, {
    level: "error",
    tags: {
      route: context.route,
      requestId: context.requestId,
      userId: context.userId ?? "anonymous",
      alertType: type,
    },
    extra: fields,
  })
}
