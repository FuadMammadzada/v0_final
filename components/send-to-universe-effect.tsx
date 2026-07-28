"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"

interface SendToUniverseEffectProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onNavigateToPage?: (pageNum: number) => void
}

export default function SendToUniverseEffect({
  isOpen,
  onClose,
  onConfirm,
  onNavigateToPage,
}: SendToUniverseEffectProps) {
  const confettiTriggered = useRef(false)
  const [sentTimestamp, setSentTimestamp] = useState<string>("")

  const fireConfetti = useCallback(() => {
    // Fire confetti from multiple angles for a full celebration effect
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      // Fire from left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#ffffff"],
      })

      // Fire from right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#ffffff"],
      })
    }, 250)

    // Also fire an initial burst from center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
      colors: ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#ffffff"],
      zIndex: 100,
    })
  }, [])

  useEffect(() => {
    if (isOpen && !confettiTriggered.current) {
      confettiTriggered.current = true
      // Capture the timestamp when modal opens (user clicked send)
      const now = new Date()
      const formattedTime = now.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      setSentTimestamp(formattedTime)
      // Fire confetti immediately when modal opens
      fireConfetti()
    }

    if (!isOpen) {
      // Reset the trigger when modal closes
      confettiTriggered.current = false
    }
  }, [isOpen, fireConfetti])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent
        className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto border-0 bg-transparent p-0 shadow-[0_0_60px_rgba(251,191,36,0.4)]"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        {/* Background Image Container */}
        <div 
          className="relative w-full rounded-lg overflow-hidden"
          style={{
            backgroundImage: `url('/images/manifest-success-bg.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/30" />
          
          {/* Content positioned over the image */}
          <div className="relative z-10 flex flex-col items-center px-4 py-5 sm:py-6">
            {/* Top Section - Exciting Title */}
            <div className="text-center space-y-1 mb-4">
              <DialogTitle className="sr-only">Manifest Sent to Universe</DialogTitle>
              <div className="text-amber-300 text-[10px] font-bold tracking-[0.2em] uppercase">
                Sacred Transmission Complete
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] font-serif tracking-wide">
                MANIFEST SENT
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="text-amber-400 text-sm">&#10022;</span>
                <span className="text-amber-200 text-xs font-light tracking-widest">TO THE UNIVERSE</span>
                <span className="text-amber-400 text-sm">&#10022;</span>
              </div>
            </div>
            
            {/* Middle Section - Message */}
            <div className="text-center py-10 sm:py-20">
              <p className="text-amber-100/90 text-xs sm:text-sm max-w-[250px] leading-relaxed drop-shadow-lg mx-auto">
                Your intention has been amplified by <span className="text-amber-300 font-semibold">108 souls</span> and released into the cosmic stream
              </p>
            </div>
            
            {/* Bottom Section - Timestamp and Button */}
            <div className="w-full space-y-3">
              {/* Timestamp Display */}
              <div className="text-center space-y-1">
                <div className="text-amber-400/80 text-[10px] tracking-wider uppercase">
                  Transmitted At
                </div>
                <div className="text-white text-xs font-mono bg-black/50 backdrop-blur-sm rounded-lg py-2 px-3 border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                  {sentTimestamp}
                </div>
              </div>
              
              {/* Continue Button */}
              <Button
                onClick={() => {
                  onConfirm()
                  onNavigateToPage?.(1)
                }}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold py-3 text-sm rounded-lg shadow-[0_0_25px_rgba(251,191,36,0.5)] hover:shadow-[0_0_35px_rgba(251,191,36,0.7)] transition-all border-2 border-amber-500/50"
              >
                Continue My Journey
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
