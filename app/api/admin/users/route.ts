import { NextResponse } from "next/server"
import { isAdminResponse, requireAdminRequest } from "@/lib/server/admin-auth"
import { isUuid } from "@/lib/server/ids"
import { createRequestLogContext } from "@/lib/server/logger"
import { captureServerError } from "@/lib/server/monitoring"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request)
  if (isAdminResponse(admin)) return admin

  const context = createRequestLogContext(request, "/api/admin/users", admin.user.id)
  const url = new URL(request.url)
  const search = url.searchParams.get("search")?.trim() ?? ""
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 100)

  try {
    const supabase = createSupabaseAdminClient()
    let query = supabase
      .from("user_profiles")
      .select(
        "id,email,name,last_manifestation,manifestation_count,bonus_searches,created_at,updated_at,payments(id,action,status,fulfilled_at,entitlement_consumed_at,amount_total,currency,created_at)",
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    if (search) {
      if (isUuid(search)) {
        query = query.eq("id", search)
      } else if (search.includes("@")) {
        query = query.ilike("email", `%${search}%`)
      } else {
        query = query.ilike("name", `%${search}%`)
      }
    }

    const { data, error } = await query
    if (error) throw new Error("Unable to load users")

    return NextResponse.json({ users: data ?? [] })
  } catch (error) {
    captureServerError(error, context, { area: "admin_users" })
    return NextResponse.json({ error: "Unable to load users" }, { status: 500 })
  }
}
