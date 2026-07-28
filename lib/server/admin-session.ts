import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { isAdminIdentity } from "./admin-auth"
import { getRequiredEnv } from "./env"

export const ADMIN_SESSION_COOKIE = "admin_console_access"
const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000

type AdminSessionPayload = {
  userId: string
  email: string | null
  exp: number
}

function signingSecret() {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url")
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function createAdminSessionToken(user: { id: string; email?: string | null }, now = Date.now()) {
  const payload: AdminSessionPayload = {
    userId: user.id,
    email: user.email ?? null,
    exp: now + ADMIN_SESSION_TTL_MS,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()) {
  if (!token) return null

  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSessionPayload
    if (!payload.userId || payload.exp <= now) {
      return null
    }

    return isAdminIdentity({ id: payload.userId, email: payload.email }) ? payload : null
  } catch {
    return null
  }
}

export function adminSessionCookieOptions() {
  const production =
    process.env.APP_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: production,
    path: "/admin",
    maxAge: ADMIN_SESSION_TTL_MS / 1000,
  }
}
