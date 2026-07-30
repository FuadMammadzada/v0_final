import { NextResponse, type NextRequest } from "next/server"

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return value.trim().replace(/\/$/, "")
  }
}

function configuredOrigins() {
  const origins = new Set<string>()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (appUrl) origins.add(normalizeOrigin(appUrl))

  for (const origin of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = origin.trim()
    if (trimmed) origins.add(normalizeOrigin(trimmed))
  }

  return origins
}

function requestOrigins(request: NextRequest) {
  const origins = new Set([normalizeOrigin(request.nextUrl.origin)])
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const host = forwardedHost || request.headers.get("host")

  if (host) {
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || request.nextUrl.protocol.replace(":", "")
    origins.add(normalizeOrigin(`${protocol}://${host}`))
  }

  return origins
}

function isV0SameOriginRequest(request: NextRequest, origin: string) {
  try {
    const hostname = new URL(origin).hostname
    return hostname.endsWith(".vusercontent.net") && request.headers.get("sec-fetch-site") === "same-origin"
  } catch {
    return false
  }
}

function applyCors(response: NextResponse, origin: string | null, requestId: string) {
  if (origin && configuredOrigins().has(normalizeOrigin(origin))) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
  }

  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type,Stripe-Signature,X-Make-Signature,X-Cron-Secret",
  )
  response.headers.set("Vary", "Origin")
  response.headers.set("X-Request-Id", requestId)
  return response
}

export function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
  const origin = request.headers.get("origin")
  const allowed = configuredOrigins()
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null
  const isSameOrigin = normalizedOrigin
    ? requestOrigins(request).has(normalizedOrigin) || isV0SameOriginRequest(request, normalizedOrigin)
    : true

  if (origin && !isSameOrigin && !allowed.has(normalizedOrigin!)) {
    return applyCors(NextResponse.json({ error: "Origin not allowed" }, { status: 403 }), null, requestId)
  }

  if (request.method === "OPTIONS") {
    return applyCors(new NextResponse(null, { status: 204 }), origin, requestId)
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-request-id", requestId)
  return applyCors(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    origin,
    requestId,
  )
}

export const config = {
  matcher: ["/api/:path*", "/admin"],
}
