import OpenAI from "openai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getOptionalEnv } from "@/lib/server/env"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody } from "@/lib/server/request"

const suggestionsSchema = z.object({
  query: z.string().trim().max(500).optional(),
})

const fallbackSuggestions = [
  "Attract abundance into my life",
  "Find my perfect career path",
  "Manifest loving relationships",
  "Achieve financial freedom",
  "Create lasting happiness",
]

function getOpenAIClient() {
  const apiKey = getOptionalEnv("OPENAI_API_KEY")
  return apiKey ? new OpenAI({ apiKey }) : null
}

function parseSuggestions(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0 && line.length <= 80)
    .slice(0, 5)
}

async function generateSuggestions(query: string): Promise<string[] | null> {
  const client = getOpenAIClient()
  if (!client || !query) return null

  const result = (await client.responses.create({
    model: getOptionalEnv("OPENAI_SUGGESTIONS_MODEL") ?? getOptionalEnv("OPENAI_MODEL") ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "Return exactly five short, positive manifestation search suggestions. Each suggestion must be under eight words.",
      },
      {
        role: "user",
        content: `User is typing: ${query}`,
      },
    ],
    max_output_tokens: 120,
  })) as { output_text?: string }

  const suggestions = result.output_text ? parseSuggestions(result.output_text) : []
  return suggestions.length > 0 ? suggestions : null
}

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "suggestions",
    limit: 30,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const parsed = await parseJsonBody(request, suggestionsSchema, { maxBytes: 2048 })
  if (!parsed.ok) return parsed.response

  try {
    const suggestions = await generateSuggestions(parsed.data.query ?? "")
    return NextResponse.json({ suggestions: suggestions ?? fallbackSuggestions })
  } catch {
    return NextResponse.json({ suggestions: fallbackSuggestions })
  }
}
