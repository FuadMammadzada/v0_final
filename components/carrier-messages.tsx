"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Carrier {
  name: string
  country: string
}

interface CarrierMessagesProps {
  carriers: Carrier[]
  arcDuration?: number
}

export default function CarrierMessages({ carriers, arcDuration = 2000 }: CarrierMessagesProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentCarrier, setCurrentCarrier] = useState<Carrier | null>(null)
  const MESSAGE_DISPLAY_TIME = 4000 // Show each message for 4 seconds

  useEffect(() => {
    if (!carriers || carriers.length === 0) {
      setCurrentCarrier(null)
      return
    }

    // Reset when carriers change
    setCurrentIndex(0)
    setCurrentCarrier(carriers[0])

    // Show carriers one by one with timing
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1
        if (next < carriers.length) {
          setCurrentCarrier(carriers[next])
          return next
        } else {
          // All messages shown, clear the display
          setCurrentCarrier(null)
          clearInterval(interval)
          return prev
        }
      })
    }, MESSAGE_DISPLAY_TIME)

    return () => clearInterval(interval)
  }, [carriers])

  if (!currentCarrier) return null

  return (
    <div className="absolute top-32 left-4 z-30 max-w-md pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="bg-black bg-opacity-70 rounded-lg p-3 pointer-events-auto"
        >
          <div className="text-purple-300 text-xs font-semibold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
            Energy Carrier
          </div>
          <div className="text-white text-sm">
            <span className="font-medium text-purple-200">{currentCarrier.name}</span>
            <span className="text-gray-300"> from </span>
            <span className="text-blue-200">{currentCarrier.country}</span>
            <span className="text-gray-300"> carried your manifest</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
