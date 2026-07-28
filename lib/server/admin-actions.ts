import "server-only"

import { createSupabaseAdminClient } from "./supabase"

export async function recordAdminAction(input: {
  adminUserId: string
  action: string
  targetType?: string
  targetId?: string | null
  metadata?: Record<string, unknown>
  requestId?: string
}) {
  const supabase = createSupabaseAdminClient()
  const metadata = {
    ...(input.metadata ?? {}),
    requestId: input.requestId,
  }

  const { error } = await supabase.from("admin_actions").insert({
    admin_user_id: input.adminUserId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata,
  })

  if (error) {
    throw new Error("Unable to record admin action")
  }

  const { error: auditError } = await supabase.from("system_audit_logs").insert({
    actor_user_id: input.adminUserId,
    severity: "info",
    action: `admin.${input.action}`,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata,
  })

  if (auditError) {
    throw new Error("Unable to record admin audit log")
  }
}
