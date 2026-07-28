import "server-only"

export type LogSeverity = "debug" | "info" | "warn" | "error"

export type RequestLogContext = {
  route: string
  requestId: string
  userId?: string | null
}

type LogFields = Record<string, unknown>

export function getRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID()
}

export function createRequestLogContext(request: Request, route: string, userId?: string | null): RequestLogContext {
  return {
    route,
    requestId: getRequestId(request),
    userId: userId ?? null,
  }
}

export function logEvent(severity: LogSeverity, message: string, context: RequestLogContext, fields: LogFields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    severity,
    message,
    route: context.route,
    requestId: context.requestId,
    userId: context.userId ?? null,
    ...fields,
  }

  const line = JSON.stringify(entry)
  if (severity === "error") {
    console.error(line)
  } else if (severity === "warn") {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export function logError(message: string, context: RequestLogContext, error: unknown, fields: LogFields = {}) {
  logEvent("error", message, context, {
    ...fields,
    error: error instanceof Error ? error.message : "Unknown error",
  })
}
