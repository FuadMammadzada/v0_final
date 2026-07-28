import { NextResponse } from "next/server"
import { isAdminResponse, requireAdminRequest } from "@/lib/server/admin-auth"
import { isUuid } from "@/lib/server/ids"
import { createRequestLogContext } from "@/lib/server/logger"
import { captureServerError } from "@/lib/server/monitoring"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

async function findUserIds(search: string) {
  const supabase = createSupabaseAdminClient()
  const term = search.trim()
  if (!term) return null
  if (isUuid(term)) return [term]

  const query = term.includes("@")
    ? supabase.from("user_profiles").select("id").ilike("email", `%${term}%`).limit(50)
    : supabase.from("user_profiles").select("id").ilike("name", `%${term}%`).limit(50)
  const { data, error } = await query
  if (error) throw new Error("Unable to search users")
  return data.map((row) => row.id)
}

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request)
  if (isAdminResponse(admin)) return admin

  const context = createRequestLogContext(request, "/api/admin/payments", admin.user.id)
  const url = new URL(request.url)
  const search = url.searchParams.get("search")?.trim() ?? ""
  const status = url.searchParams.get("status")?.trim() ?? ""
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 100)

  try {
    const supabase = createSupabaseAdminClient()
    let query = supabase
      .from("payments")
      .select(
        "id,user_id,stripe_checkout_session_id,stripe_payment_intent_id,stripe_price_id,product_id,action,amount_total,currency,status,fulfilled_at,entitlement_consumed_at,created_at,updated_at,user_profiles(email,name)",
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq("status", status)
    }

    const userIds = search ? await findUserIds(search) : null
    if (userIds) {
      if (userIds.length === 0) {
        return NextResponse.json({ payments: [] })
      }
      query = query.in("user_id", userIds)
    }

    const { data, error } = await query
    if (error) throw new Error("Unable to load payments")

    return NextResponse.json({ payments: data ?? [] })
  } catch (error) {
    captureServerError(error, context, { area: "admin_payments" })
    return NextResponse.json({ error: "Unable to load payments" }, { status: 500 })
  }
}
