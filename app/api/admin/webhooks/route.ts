import { NextResponse } from "next/server"
import { isAdminResponse, requireAdminRequest } from "@/lib/server/admin-auth"
import { createRequestLogContext } from "@/lib/server/logger"
import { captureServerError } from "@/lib/server/monitoring"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request)
  if (isAdminResponse(admin)) return admin

  const context = createRequestLogContext(request, "/api/admin/webhooks", admin.user.id)
  const url = new URL(request.url)
  const status = url.searchParams.get("status")?.trim() ?? ""
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 100)

  try {
    const supabase = createSupabaseAdminClient()
    let query = supabase
      .from("webhook_events")
      .select("id,type,status,error,processed_at,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query
    if (error) throw new Error("Unable to load webhooks")

    return NextResponse.json({ webhooks: data ?? [] })
  } catch (error) {
    captureServerError(error, context, { area: "admin_webhooks" })
    return NextResponse.json({ error: "Unable to load webhooks" }, { status: 500 })
  }
}
