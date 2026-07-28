"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

interface ScrollAnimationProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right" | "scale" | "fade"
}

export default function ScrollAnimation({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true)
          }, delay)
        } else {
          // Reset animation when element goes out of view
          setIsVisible(false)
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px",
      },
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  const getAnimationClasses = () => {
    const baseClasses = "transition-all duration-700 ease-out"

    if (!isVisible) {
      switch (direction) {
        case "up":
          return `${baseClasses} opacity-0 translate-y-12`
        case "down":
          return `${baseClasses} opacity-0 -translate-y-12`
        case "left":
          return `${baseClasses} opacity-0 translate-x-12`
        case "right":
          return `${baseClasses} opacity-0 -translate-x-12`
        case "scale":
          return `${baseClasses} opacity-0 scale-75`
        case "fade":
          return `${baseClasses} opacity-0`
        default:
          return `${baseClasses} opacity-0 translate-y-12`
      }
    }

    return `${baseClasses} opacity-100 translate-y-0 translate-x-0 scale-100`
  }

  return (
    <div ref={elementRef} className={`${getAnimationClasses()} ${className}`}>
      {children}
    </div>
  )
}
