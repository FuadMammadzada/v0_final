"use client"

import { useEffect, useState } from "react"

const DAY_VIDEO = "/videos/hero-day.mp4"
const NIGHT_VIDEO = "/videos/hero-night.mp4"

export function videoForLocalTime(date = new Date()) {
  const hour = date.getHours()
  return hour >= 6 && hour < 18 ? DAY_VIDEO : NIGHT_VIDEO
}

export default function TimeAwareMobileHeroVideo() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null)

  useEffect(() => {
    const updateVideo = () => setVideoSrc(videoForLocalTime())

    updateVideo()
    const interval = window.setInterval(updateVideo, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  if (!videoSrc) {
    return <div className="absolute inset-0 bg-black md:hidden" aria-hidden="true" />
  }

  return (
    <video
      key={videoSrc}
      className="absolute inset-0 h-full w-full bg-black object-contain md:hidden"
      src={videoSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      data-testid="mobile-hero-video"
    />
  )
}
