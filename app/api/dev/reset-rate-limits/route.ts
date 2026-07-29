import { NextResponse } from "next/server"
import { resetLocalRateLimitForTests } from "@/lib/server/rate-limit"

/**
 * Development-only endpoint to reset rate limits for testing.
 * This resets the application's local rate limits.
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
      message: "Local rate limits have been reset",
      notes: {
        localRateLimits: "Reset successfully",
        supabaseAuthLimits:
          "Supabase Auth rate limits reset automatically after ~1 hour. To test with new emails, use unique email addresses or wait for the limit window to expire.",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reset rate limits" },
      { status: 500 }
    )
  }
}
