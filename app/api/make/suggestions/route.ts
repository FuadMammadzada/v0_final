import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth"
import { getOptionalEnv } from "@/lib/server/env"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody, querySchema } from "@/lib/server/request"
import { callMakeWebhook } from "../_shared"

const suggestionsSchema = z.object({
  query: querySchema,
})

const fallbackSuggestions = [
  "Attract abundance into my life",
  "Find my perfect career path",
  "Manifest loving relationships",
  "Achieve financial freedom",
  "Create lasting happiness",
]

type SuggestionsWebhookResponse = {
  suggestions?: unknown
}

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "make-suggestions",
    limit: 20,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const auth = await authenticateRequest(request)
  if (!auth) {
    return unauthorizedResponse()
  }

  const parsed = await parseJsonBody(request, suggestionsSchema, { maxBytes: 2048 })
  if (!parsed.ok) return parsed.response

  const webhookUrl = getOptionalEnv("MAKE_SUGGESTIONS_WEBHOOK_URL")
  if (!webhookUrl) {
    return NextResponse.json({ suggestions: fallbackSuggestions })
  }

  try {
    const data = (await callMakeWebhook(webhookUrl, { query: parsed.data.query }, 10_000)) as SuggestionsWebhookResponse
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.filter((item: unknown) => typeof item === "string").slice(0, 8)
      : fallbackSuggestions

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: fallbackSuggestions })
  }
}
