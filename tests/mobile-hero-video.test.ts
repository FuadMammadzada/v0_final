import { describe, expect, it } from "vitest"
import { videoForLocalTime } from "@/components/time-aware-mobile-hero-video"

describe("mobile hero video schedule", () => {
  it("uses the daylight video from 06:00 until 17:59 local time", () => {
    expect(videoForLocalTime(new Date(2026, 5, 13, 6, 0))).toBe("/videos/hero-day.mp4")
    expect(videoForLocalTime(new Date(2026, 5, 13, 17, 59))).toBe("/videos/hero-day.mp4")
  })

  it("uses the night video from 18:00 until 05:59 local time", () => {
    expect(videoForLocalTime(new Date(2026, 5, 13, 18, 0))).toBe("/videos/hero-night.mp4")
    expect(videoForLocalTime(new Date(2026, 5, 13, 5, 59))).toBe("/videos/hero-night.mp4")
  })
})
