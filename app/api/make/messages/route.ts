import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth"
import { getRequiredEnv } from "@/lib/server/env"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody, querySchema } from "@/lib/server/request"
import { callMakeWebhook } from "../_shared"

const messagesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  query: querySchema,
})

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "make-messages",
    limit: 20,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const auth = await authenticateRequest(request)
  if (!auth) {
    return unauthorizedResponse()
  }

  const parsed = await parseJsonBody(request, messagesSchema, { maxBytes: 4096 })
  if (!parsed.ok) return parsed.response

  try {
    const data = await callMakeWebhook(
      getRequiredEnv("MAKE_MESSAGES_WEBHOOK_URL"),
      {
        lat: parsed.data.lat,
        lon: parsed.data.lon,
        query: parsed.data.query,
        getMessages: true,
        userId: auth.user.id,
      },
      20_000,
    )

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: "Messages workflow failed" }, { status: 502 })
  }
}
