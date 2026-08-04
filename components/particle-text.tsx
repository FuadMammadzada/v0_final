"use client"

import { useRef, useEffect, useState } from "react"

interface ParticleTextProps {
  text?: string
  imageSrc?: string
  className?: string
}

export default function ParticleText({ text, imageSrc, className = "" }: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const isTouchingRef = useRef(false)
  const [isVisible, setIsVisible] = useState(true)
  const [canvasKey, setCanvasKey] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true })
    if (!ctx) return

    // Get device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1
    
    // Store display dimensions
    let displayWidth = 0
    let displayHeight = 0

    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (container) {
        displayWidth = container.offsetWidth
        displayHeight = container.offsetHeight

        // Set canvas size accounting for device pixel ratio
        canvas.width = displayWidth * dpr
        canvas.height = displayHeight * dpr
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`
        
        // Scale context to match DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }

    updateCanvasSize()

    let particles: {
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      color: string
      scatteredColor: string
      life: number
    }[] = []

    let sourceImageData: ImageData | null = null

    function createTextImage() {
      if (!ctx || !canvas || !text) return

      ctx.fillStyle = "white"
      ctx.save()

      // Calculate font size that fits within display dimensions with padding
      const maxWidth = displayWidth * 0.95
      let fontSize = Math.min((displayWidth / text.length) * 2.2, displayHeight * 0.4)
      
      // Ensure minimum readable size
      const minFontSize = 24
      fontSize = Math.max(fontSize, minFontSize)
      
      ctx.font = `bold ${fontSize}px Arial, sans-serif`
      
      // Measure and shrink if needed to fit
      let textWidth = ctx.measureText(text).width
      while (textWidth > maxWidth && fontSize > minFontSize) {
        fontSize -= 2
        ctx.font = `bold ${fontSize}px Arial, sans-serif`
        textWidth = ctx.measureText(text).width
      }
      
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      ctx.fillText(text, displayWidth / 2, displayHeight / 2)

      ctx.restore()

      sourceImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.clearRect(0, 0, displayWidth, displayHeight)
    }

    function createImageSource() {
      if (!ctx || !canvas) return

      const imageSource = imageSrc || "/manifestchain-logo.png"

      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight)

        const scale = Math.min(displayWidth / img.width, displayHeight / img.height) * 0.8

        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale

        const x = (displayWidth - scaledWidth) / 2
        const y = (displayHeight - scaledHeight) / 2

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

        sourceImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        ctx.clearRect(0, 0, displayWidth, displayHeight)

        createInitialParticles()
        animate()
      }

      img.onerror = () => {
        if (text) {
          createTextImage()
          createInitialParticles()
          animate()
        }
      }

      img.src = imageSource
    }

    function createParticle() {
      if (!ctx || !canvas || !sourceImageData) return null

      const data = sourceImageData.data

      for (let attempt = 0; attempt < 100; attempt++) {
        // Sample from high-res canvas
        const canvasX = Math.floor(Math.random() * canvas.width)
        const canvasY = Math.floor(Math.random() * canvas.height)
        const pixelIndex = (canvasY * canvas.width + canvasX) * 4

        if (data[pixelIndex + 3] > 128) {
          const r = data[pixelIndex]
          const g = data[pixelIndex + 1]
          const b = data[pixelIndex + 2]

          // Convert to display coordinates
          const x = canvasX / dpr
          const y = canvasY / dpr

          // Particle size - slightly larger for better visibility
          const particleSize = Math.random() * 1.0 + 0.6
          
          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: particleSize,
            color: `rgba(${r}, ${g}, ${b}, 1)`,
            scatteredColor: `hsl(${Math.random() * 60 + 180}, 70%, 60%)`,
            life: Math.random() * 100 + 50,
          }
        }
      }

      return null
    }

    function createInitialParticles() {
      // Balanced density for clear, readable text (use display dimensions)
      const divisor = 40
      const particleCount = Math.floor((displayWidth * displayHeight) / divisor)
      particles = []
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle()
        if (particle) particles.push(particle)
      }
    }

    let animationFrameId: number

    function animate() {
      if (!ctx || !canvas || !isVisible) return

      ctx.clearRect(0, 0, displayWidth, displayHeight)

      const { x: mouseX, y: mouseY } = mousePositionRef.current
      const maxDistance = 180

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance && (isTouchingRef.current || !("ontouchstart" in window))) {
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          const moveX = Math.cos(angle) * force * 60
          const moveY = Math.sin(angle) * force * 60
          p.x = p.baseX - moveX
          p.y = p.baseY - moveY

          ctx.fillStyle = p.scatteredColor
        } else {
          p.x += (p.baseX - p.x) * 0.05
          p.y += (p.baseY - p.y) * 0.05
          ctx.fillStyle = p.color
        }

        ctx.shadowColor = p.color
        ctx.shadowBlur = 3

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle()
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      const divisor = 40
      const targetParticleCount = Math.floor((displayWidth * displayHeight) / divisor)
      while (particles.length < targetParticleCount) {
        const newParticle = createParticle()
        if (newParticle) particles.push(newParticle)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    if (imageSrc || (!text && !imageSrc)) {
      createImageSource()
    } else if (text) {
      createTextImage()
      createInitialParticles()
      animate()
    }

    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      // Debounce resize to handle orientation changes properly
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        // Cancel current animation
        cancelAnimationFrame(animationFrameId)
        
        // Reset canvas with new dimensions
        updateCanvasSize()
        particles = []
        sourceImageData = null
        
        // Reinitialize
        if (imageSrc || (!text && !imageSrc)) {
          createImageSource()
        } else if (text) {
          createTextImage()
          createInitialParticles()
          animate()
        }
      }, 100)
    }
    
    const handleOrientationChange = () => {
      // Force full reinitialization on orientation change
      setCanvasKey(prev => prev + 1)
    }

    const handleMove = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect()
      mousePositionRef.current = {
        x: x - rect.left,
        y: y - rect.top,
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      mousePositionRef.current = { x: -1000, y: -1000 }
    }

    const handleMouseLeave = () => {
      if (!("ontouchstart" in window)) {
        mousePositionRef.current = { x: -1000, y: -1000 }
      }
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleOrientationChange)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("mouseleave", handleMouseLeave)
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      clearTimeout(resizeTimeout)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleOrientationChange)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
      cancelAnimationFrame(animationFrameId)
    }
  }, [text, imageSrc, isVisible, canvasKey])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 },
    )

    if (canvasRef.current) {
      observer.observe(canvasRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div className={`relative ${className}`}>
      <canvas
        key={canvasKey}
        ref={canvasRef}
        className="w-full h-full touch-none"
        aria-label={`Interactive particle effect${text ? ` displaying "${text}"` : imageSrc ? ` displaying image` : ""}`}
      />
    </div>
  )
}
