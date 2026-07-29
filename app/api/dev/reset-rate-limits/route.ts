import { NextResponse } from "next/server"
import { resetLocalRateLimitForTests } from "@/lib/server/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Development-only endpoint to reset rate limits for testing.
 * This resets the application's local rate limits including:
 * - Manifestation API limits (make-manifestation)
 * - Search API limits
 * - Suggestions API limits
 * Note: Supabase Auth rate limits are managed by Supabase and reset automatically after ~1 hour.
 */
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    )
  }

  try {
    // Reset local rate limits
    resetLocalRateLimitForTests()

    return NextResponse.json({
      success: true,
      message: "All local rate limits have been reset successfully",
      resetItems: {
        "manifestation-api": "make-manifestation (6 per 60s) - cleared",
        "search-api": "Search requests - cleared",
        "suggestions-api": "Suggestions requests - cleared",
      },
      notes: {
        localRateLimits: "All local rate limit buckets cleared. You can now test manifestations freely.",
        supabaseAuthLimits:
          "Supabase Auth rate limits reset automatically after ~1 hour. To test with new emails, use unique email addresses or wait for the limit window to expire.",
      },
      testingTips: [
        "Manifestation requests should now work without rate limit errors",
        "Each user gets 6 manifestation attempts per minute",
        "Use unique emails for signup testing (rate limit resets after 1 hour per email)",
        "For continuous testing, use the same account and request manifestations",
      ],
    })
  } catch (error) {
    console.error("[v0] Rate limit reset error:", error)
    return NextResponse.json(
      { error: "Failed to reset rate limits" },
      { status: 500 }
    )
  }
}
