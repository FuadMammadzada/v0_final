import { NextResponse } from "next/server"
import { z } from "zod"
import { getOptionalEnv } from "@/lib/server/env"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody } from "@/lib/server/request"

const feedbackSchema = z.object({
  feedback: z.string().trim().min(1).max(4000),
  timestamp: z.string().datetime().optional(),
  userAgent: z.string().max(512).optional(),
  url: z.string().url().max(2048).optional(),
})

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "feedback",
    limit: 5,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const parsed = await parseJsonBody(request, feedbackSchema, { maxBytes: 8192 })
  if (!parsed.ok) return parsed.response

  const endpoint = getOptionalEnv("FORMSPREE_ENDPOINT")
  if (!endpoint) {
    return NextResponse.json({ error: "Feedback service is not configured" }, { status: 503 })
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "New ManifestChain Feedback",
        feedback: parsed.data.feedback,
        timestamp: parsed.data.timestamp ?? new Date().toISOString(),
        userAgent: parsed.data.userAgent,
        url: parsed.data.url,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Feedback delivery failed" }, { status: 502 })
    }

    return NextResponse.json({ message: "Feedback sent successfully" })
  } catch {
    return NextResponse.json({ error: "Feedback delivery failed" }, { status: 502 })
  }
}
