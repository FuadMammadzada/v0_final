import "server-only"

import { NextResponse } from "next/server"
import type { AuthenticatedRequest } from "./auth"
import { authenticateRequest, unauthorizedResponse } from "./auth"
import { getOptionalEnv } from "./env"

export type AdminRequest = AuthenticatedRequest & {
  adminEmail: string | null
}

function parseList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isAdminIdentity(identity: { id: string; email?: string | null }) {
  const adminUserIds = parseList(getOptionalEnv("ADMIN_USER_IDS"))
  const adminEmails = parseList(getOptionalEnv("ADMIN_EMAILS"))
  const email = identity.email?.toLowerCase() ?? ""

  return adminUserIds.has(identity.id.toLowerCase()) || (email.length > 0 && adminEmails.has(email))
}

export function isAdminUser(user: AuthenticatedRequest["user"]) {
  return isAdminIdentity({ id: user.id, email: user.email ?? null })
}

export async function requireAdminRequest(request: Request): Promise<AdminRequest | NextResponse> {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return unauthorizedResponse()
  }

  if (!isAdminUser(auth.user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  return { ...auth, adminEmail: auth.user.email ?? null }
}

export function isAdminResponse(value: AdminRequest | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}
