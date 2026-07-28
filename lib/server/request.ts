import "server-only"

import { NextResponse } from "next/server"
import { z, type ZodSchema } from "zod"

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  options: { maxBytes?: number } = {},
): Promise<ParsedBody<T>> {
  const maxBytes = options.maxBytes ?? 16_384
  const text = await request.text()

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: NextResponse.json({ error: "Request body too large" }, { status: 413 }) }
  }

  let json: unknown
  try {
    json = text.trim().length > 0 ? JSON.parse(text) : {}
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 }),
    }
  }

  return { ok: true, data: parsed.data }
}

export const querySchema = z.string().trim().min(1).max(500)
