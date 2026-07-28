import "server-only"

import { NextResponse } from "next/server"
import { getOptionalEnv } from "./env"

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
  requireDistributed?: boolean
}

type LocalBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, LocalBucket>()

function now() {
  return Date.now()
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwardedFor || request.headers.get("x-real-ip") || "unknown"
}

async function upstashRateLimit(key: string, limit: number, windowMs: number): Promise<boolean | null> {
  const url = getOptionalEnv("UPSTASH_REDIS_REST_URL")
  const token = getOptionalEnv("UPSTASH_REDIS_REST_TOKEN")
  if (!url || !token) {
    return null
  }

  const windowSeconds = Math.ceil(windowMs / 1000)
  const redisKey = `rate:${key}`

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, windowSeconds, "NX"],
    ]),
  })

  if (!response.ok) {
    return null
  }

  const result = (await response.json()) as Array<{ result: number }>
  const count = Number(result?.[0]?.result ?? 0)
  return count <= limit
}

function localRateLimit(key: string, limit: number, windowMs: number): boolean {
  const current = now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= current) {
    buckets.set(key, { count: 1, resetAt: current + windowMs })
    return true
  }

  bucket.count += 1
  return bucket.count <= limit
}

export async function checkRateLimit(request: Request, options: RateLimitOptions): Promise<NextResponse | null> {
  const key = `${options.key}:${getClientIp(request)}`
  const upstashAllowed = await upstashRateLimit(key, options.limit, options.windowMs).catch(() => null)

  if (upstashAllowed === null && options.requireDistributed && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 })
  }

  const allowed = upstashAllowed ?? localRateLimit(key, options.limit, options.windowMs)

  if (allowed) {
    return null
  }

  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}

export function resetLocalRateLimitForTests() {
  buckets.clear()
}
