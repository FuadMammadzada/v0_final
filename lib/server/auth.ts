import "server-only"

import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createRequestLogContext, logEvent } from "./logger"
import { createSupabaseAuthClient } from "./supabase"

export type AuthenticatedRequest = {
  token: string
  user: User
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedRequest | null> {
  const token = getBearerToken(request)
  if (!token) {
    return null
  }

  const supabase = createSupabaseAuthClient()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    logEvent("warn", "Authentication failed", createRequestLogContext(request, new URL(request.url).pathname), {
      hasBearerToken: true,
    })
    return null
  }

  return { token, user: data.user }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 })
}
