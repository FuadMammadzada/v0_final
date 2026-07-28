import { NextResponse } from "next/server"
import { isAdminResponse, requireAdminRequest } from "@/lib/server/admin-auth"
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions, createAdminSessionToken } from "@/lib/server/admin-session"

export async function POST(request: Request) {
  const admin = await requireAdminRequest(request)
  if (isAdminResponse(admin)) return admin

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken({ id: admin.user.id, email: admin.user.email ?? null }),
    adminSessionCookieOptions(),
  )
  return response
}
