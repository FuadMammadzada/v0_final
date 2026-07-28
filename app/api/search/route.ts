import OpenAI from "openai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getOptionalEnv } from "@/lib/server/env"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody, querySchema } from "@/lib/server/request"

const searchSchema = z.object({
  query: querySchema,
})

const fallbackResponse =
  "I sense your intention. Focus on what you truly desire, name one concrete next step, and let your attention return to that step today."

function buildFallback(query: string) {
  return `I understand you want to manifest: "${query}". Hold the intention clearly, write down one action you can take today, and return to that action with steady focus.`
}

function getOpenAIClient() {
  const apiKey = getOptionalEnv("OPENAI_API_KEY")
  return apiKey ? new OpenAI({ apiKey }) : null
}

async function generateManifestationResponse(query: string): Promise<string | null> {
  const client = getOpenAIClient()
  if (!client) return null

  const result = (await client.responses.create({
    model: getOptionalEnv("OPENAI_SEARCH_MODEL") ?? getOptionalEnv("OPENAI_MODEL") ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You write brief, grounded manifestation guidance. Do not request sensitive personal data. Avoid medical, legal, or financial claims.",
      },
      {
        role: "user",
        content: `User intention: ${query}\nReturn a concise, encouraging response in 2 short paragraphs.`,
      },
    ],
    max_output_tokens: 220,
  })) as { output_text?: string }

  const text = result.output_text?.trim()
  return text ? text.slice(0, 2000) : null
}

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "search",
    limit: 20,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const parsed = await parseJsonBody(request, searchSchema, { maxBytes: 2048 })
  if (!parsed.ok) return parsed.response

  const query = parsed.data.query

  try {
    const response = await generateManifestationResponse(query)

    return NextResponse.json({
      success: true,
      response: response ?? buildFallback(query),
      query,
      timestamp: new Date().toISOString(),
      fallback: !response,
    })
  } catch {
    return NextResponse.json({
      success: true,
      response: fallbackResponse,
      query,
      timestamp: new Date().toISOString(),
      fallback: true,
    })
  }
}
