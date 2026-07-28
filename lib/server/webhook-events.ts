import "server-only"

import type Stripe from "stripe"
import { createSupabaseAdminClient } from "./supabase"

export type WebhookProcessingDecision = "process" | "already_processed"

function safeWebhookError(error: unknown) {
  const message = error instanceof Error ? error.message : "Webhook processing failed"
  return message.slice(0, 500)
}

export async function beginWebhookEvent(event: Stripe.Event): Promise<WebhookProcessingDecision> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("webhook_events").insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
    status: "pending",
    processed_at: null,
    error: null,
    updated_at: new Date().toISOString(),
  })

  if (!error) {
    return "process"
  }

  if (error.code !== "23505") {
    throw new Error("Unable to record webhook event")
  }

  const { data, error: selectError } = await supabase
    .from("webhook_events")
    .select("status")
    .eq("id", event.id)
    .maybeSingle()

  if (selectError) {
    throw new Error("Unable to load webhook event")
  }

  if (data?.status === "processed") {
    return "already_processed"
  }

  const { error: updateError } = await supabase
    .from("webhook_events")
    .update({
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
      status: "pending",
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id)

  if (updateError) {
    throw new Error("Unable to retry webhook event")
  }

  return "process"
}

export async function markWebhookEventProcessed(eventId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)

  if (error) {
    throw new Error("Unable to mark webhook processed")
  }
}

export async function markWebhookEventFailed(eventId: string, error: unknown) {
  const supabase = createSupabaseAdminClient()
  const { error: updateError } = await supabase
    .from("webhook_events")
    .update({
      status: "failed",
      error: safeWebhookError(error),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)

  if (updateError) {
    throw new Error("Unable to mark webhook failed")
  }
}
