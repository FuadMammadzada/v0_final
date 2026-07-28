import "server-only"

import { z } from "zod"
import { createSupabaseAdminClient } from "./supabase"

export type ManifestationMode = "default" | "complete_108"

type ReservationResult =
  | { ok: true; manifestationId: string; paymentId: string | null }
  | { ok: false; status: 402 | 403; error: string }

const reservationSchema = z.object({
  manifestationId: z.string().uuid(),
  paymentId: z.string().uuid().nullable(),
})

const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  last_manifestation: z.string().nullable(),
  manifestation_count: z.number(),
  bonus_searches: z.number(),
})

export type ManifestationProfile = z.infer<typeof profileSchema>

function mapReservationError(message: string): ReservationResult | null {
  if (message.includes("paid_entitlement_required")) {
    return { ok: false, status: 402, error: "Payment required" }
  }

  if (message.includes("manifestation_limit_exceeded")) {
    return { ok: false, status: 403, error: "Manifestation limit exceeded" }
  }

  return null
}

export async function reserveManifestationAttempt(
  userId: string,
  mode: ManifestationMode,
  query: string,
): Promise<ReservationResult> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc("reserve_manifestation_attempt", {
    p_user_id: userId,
    p_mode: mode,
    p_query: query,
  })

  if (error) {
    const mapped = mapReservationError(error.message)
    if (mapped) return mapped
    throw new Error("Unable to reserve manifestation attempt")
  }

  const parsed = reservationSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error("Invalid manifestation reservation")
  }

  return { ok: true, manifestationId: parsed.data.manifestationId, paymentId: parsed.data.paymentId }
}

export async function finalizeManifestationAttempt(
  userId: string,
  manifestationId: string,
  response: string,
): Promise<ManifestationProfile> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc("finalize_manifestation_attempt", {
    p_user_id: userId,
    p_manifestation_id: manifestationId,
    p_response: response.slice(0, 20_000),
  })

  if (error) {
    throw new Error("Unable to finalize manifestation attempt")
  }

  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error("Invalid manifestation profile")
  }

  return parsed.data
}

export async function releaseManifestationAttempt(userId: string, manifestationId: string, reason: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.rpc("release_manifestation_attempt", {
    p_user_id: userId,
    p_manifestation_id: manifestationId,
    p_reason: reason.slice(0, 500),
  })

  if (error) {
    throw new Error("Unable to release manifestation attempt")
  }
}
