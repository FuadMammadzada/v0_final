import { cookies } from "next/headers"
import AdminGate from "@/components/admin/admin-gate"
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/server/admin-session"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const adminSession = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)

  if (adminSession) {
    const { default: AdminDashboard } = await import("@/components/admin/admin-dashboard")
    return <AdminDashboard />
  }

  return <AdminGate />
}
