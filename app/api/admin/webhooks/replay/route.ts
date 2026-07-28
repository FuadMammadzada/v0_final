import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { z } from "zod"
import { isAdminResponse, requireAdminRequest } from "@/lib/server/admin-auth"
import { recordAdminAction } from "@/lib/server/admin-actions"
import { createRequestLogContext } from "@/lib/server/logger"
import { captureServerError, emitAlert } from "@/lib/server/monitoring"
import { handleStripeEvent } from "@/lib/server/stripe-webhook-handler"
import { markWebhookEventFailed, markWebhookEventProcessed } from "@/lib/server/webhook-events"
import { parseJsonBody } from "@/lib/server/request"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

const replaySchema = z.object({
  eventId: z.string().trim().min(5).max(255),
})

export async function POST(request: Request) {
  const admin = await requireAdminRequest(request)
  if (isAdminResponse(admin)) return admin

  const context = createRequestLogContext(request, "/api/admin/webhooks/replay", admin.user.id)
  const parsed = await parseJsonBody(request, replaySchema, { maxBytes: 1024 })
  if (!parsed.ok) return parsed.response

  try {
    const supabase = createSupabaseAdminClient()
    const { data: webhook, error } = await supabase
      .from("webhook_events")
      .select("id,status,payload")
      .eq("id", parsed.data.eventId)
      .maybeSingle()

    if (error) throw new Error("Unable to load webhook")
    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    if (webhook.status === "processed") {
      return NextResponse.json({ error: "Webhook is already processed" }, { status: 409 })
    }

    await handleStripeEvent(webhook.payload as Stripe.Event)
    await markWebhookEventProcessed(webhook.id)
    await recordAdminAction({
      adminUserId: admin.user.id,
      action: "webhook.replay",
      targetType: "webhook_event",
      targetId: webhook.id,
      requestId: context.requestId,
    })

    return NextResponse.json({ replayed: true })
  } catch (error) {
    await markWebhookEventFailed(parsed.data.eventId, error).catch(() => undefined)
    captureServerError(error, context, { area: "admin_webhook_replay" })
    emitAlert("webhook_failure", context, { eventId: parsed.data.eventId, replay: true })
    return NextResponse.json({ error: "Webhook replay failed" }, { status: 500 })
  }
}
