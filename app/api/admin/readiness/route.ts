import { NextResponse } from "next/server"
import { isAdminResponse, requireAdminRequest } from "@/lib/server/admin-auth"
import { getProductionReadinessChecklist } from "@/lib/server/startup-validation"

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request)
  if (isAdminResponse(admin)) return admin

  return NextResponse.json({
    checklist: getProductionReadinessChecklist(),
    generatedAt: new Date().toISOString(),
  })
}
