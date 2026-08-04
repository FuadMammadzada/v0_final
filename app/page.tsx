"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { Volume2, VolumeX, ChevronsUpIcon, ChevronUp, ChevronDown } from "lucide-react"
import ParticleText from "@/components/particle-text"
import ManifestationSearch from "@/components/manifestation-search"
import AuthModal from "@/components/auth-modal"
import DatabaseSetupBanner from "@/components/database-setup-banner"
import FeedbackButton from "@/components/feedback-button"
import CarrierMessages from "@/components/carrier-messages"
import SendToUniverseEffect from "@/components/send-to-universe-effect"
import TimeAwareMobileHeroVideo from "@/components/time-aware-mobile-hero-video"
import { PaymentModal } from "@/components/payment-modal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

function HomeContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResult, setSearchResult] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [page2SubSection, setPage2SubSection] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPage2SubTransition, setIsPage2SubTransition] = useState(false)

  const [manifestationResetKey, setManifestationResetKey] = useState(0)
  const [useComplete108Hook, setUseComplete108Hook] = useState(false)

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [sendToUniverseOpen, setSendToUniverseOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>("")

  const {
    user,
    loading: authLoading,
    signOut,
    databaseReady,
    userName,
    canManifest,
    refreshUserProfile,
  } = useAuth()

  const { toast } = useToast()

  // Audio state - enhanced with interrupt handling
  const [isMuted, setIsMuted] = useState(false)
  const [showHzTooltip, setShowHzTooltip] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [canPlay, setCanPlay] = useState(false)
  const [userWantsToPlay, setUserWantsToPlay] = useState(false) // Track user intent
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioControlRef = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const globeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)
  const lastWheelTime = useRef(0)

  // Background music
  const testSongs = ["/images/es-velvet-20skies-20-20center-20of-20attention.mp3"]

  const [songs, setSongs] = useState<string[]>(testSongs)

  // Initialize random song on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * songs.length)
    setCurrentSongIndex(randomIndex)
  }, [])

  // Persistent play function that retries on interruption
  const persistentPlay = useCallback(async () => {
    // Marked as async
    if (!audioRef.current || isMuted || !userWantsToPlay) return

    try {
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }

      const playPromise = audioRef.current.play()

      if (playPromise !== undefined) {
        await playPromise
      }
    } catch (error: any) {
      // If it's an interruption, retry after a short delay
      if (error.name === "AbortError" || error.message.includes("interrupted")) {
        retryTimeoutRef.current = setTimeout(() => {
          if (userWantsToPlay && !isMuted) {
            persistentPlay()
          }
        }, 1000)
      } else {
        setAudioError(`Play failed: ${error.message}`)
      }
    }
  }, [isMuted, userWantsToPlay])

  // Enhanced audio management with interrupt handling
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current
      audio.volume = 1.0
      audio.loop = false
      audio.preload = "auto"

      const handleLoadStart = () => {
        setAudioError(null)
        setAudioLoaded(false)
        setCanPlay(false)
      }

      const handleLoadedData = () => {
        setAudioLoaded(true)
      }

      const handleCanPlay = () => {
        setCanPlay(true)

        // Auto-play if user wants to play - be more aggressive
        if (userWantsToPlay && !isMuted && audioInitialized) {
          // Try immediate play
          audioRef.current?.play().catch(() => {
            // If that fails, use persistent play
            persistentPlay()
          })
        }
      }

      const handlePlay = () => {
        setIsPlaying(true)
      }

      const handlePause = () => {
        setIsPlaying(false)

        // If user wants to play but audio was paused (interrupted), retry
        if (userWantsToPlay && !isMuted) {
          retryTimeoutRef.current = setTimeout(() => {
            if (userWantsToPlay && !isMuted) {
              persistentPlay()
            }
          }, 500)
        }
      }

      const handleEnded = () => {
        setIsPlaying(false)
        playNextSong()
      }

      const handleError = (e: Event) => {
        const error = (e.target as HTMLAudioElement)?.error
        let errorMessage = "Unknown error"

        if (error) {
          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              errorMessage = "Loading aborted"
              break
            case error.MEDIA_ERR_NETWORK:
              errorMessage = "Network error"
              break
            case error.MEDIA_ERR_DECODE:
              errorMessage = "Decode error"
              break
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = "Format not supported"
              break
          }
        }

        setAudioError(errorMessage)
        setIsPlaying(false)
        setCanPlay(false)

        // Try next song on error
        setTimeout(() => {
          playNextSong()
        }, 1000)
      }

      const handleVolumeChange = () => {
        // Volume change handler
      }

      // Handle when audio becomes available again (e.g., after interruption)
      const handleCanPlayThrough = () => {
        if (userWantsToPlay && !isMuted && !isPlaying) {
          persistentPlay()
        }
      }

      // Add all event listeners
      audio.addEventListener("loadstart", handleLoadStart)
      audio.addEventListener("loadeddata", handleLoadedData)
      audio.addEventListener("canplay", handleCanPlay)
      audio.addEventListener("canplaythrough", handleCanPlayThrough)
      audio.addEventListener("play", handlePlay)
      audio.addEventListener("pause", handlePause)
      audio.addEventListener("ended", handleEnded)
      audio.addEventListener("error", handleError)
      audio.addEventListener("volumechange", handleVolumeChange)

      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }
        audio.removeEventListener("loadstart", handleLoadStart)
        audio.removeEventListener("loadeddata", handleLoadedData)
        audio.removeEventListener("canplay", handleCanPlay)
        audio.removeEventListener("canplaythrough", handleCanPlayThrough)
        audio.removeEventListener("play", handlePlay)
        audio.removeEventListener("pause", handlePause)
        audio.removeEventListener("ended", handleEnded)
        audio.removeEventListener("error", handleError)
        audio.removeEventListener("volumechange", handleVolumeChange)
      }
    }
  }, [currentSongIndex, isMuted, audioInitialized, userWantsToPlay, persistentPlay, isPlaying])

  const manualPlay = async () => {
    // Marked as async
    if (!audioRef.current) {
      return
    }

    setUserWantsToPlay(true)
    await persistentPlay()
  }

  const manualPause = () => {
    if (audioRef.current) {
      setUserWantsToPlay(false)
      audioRef.current.pause()

      // Clear any retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }

  const playNextSong = () => {
    const nextIndex = (currentSongIndex + 1) % songs.length
    setCurrentSongIndex(nextIndex)
    setIsPlaying(false)
    setCanPlay(false)
    setAudioLoaded(false)

    // Keep user intent if they were playing
    if (userWantsToPlay) {
      setTimeout(() => {
        persistentPlay()
      }, 500)
    }
  }

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)

    if (audioRef.current) {
      audioRef.current.muted = newMuted
    }

    // If unmuting and user wants to play, start playing
    if (!newMuted && userWantsToPlay) {
      persistentPlay()
    }
  }

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(() => {
    if (!audioInitialized) {
      setAudioInitialized(true)
      setUserWantsToPlay(true) // Automatically want to play on first interaction

      // Force load and try to play immediately
      if (audioRef.current) {
        audioRef.current.load()

        // Try to play immediately without waiting
        const attemptPlay = async () => {
          // Marked as async
          try {
            await audioRef.current?.play()
          } catch (error: any) {
            // If immediate play fails, try the persistent method
            setTimeout(() => {
              persistentPlay()
            }, 100)
          }
        }

        // Try both immediate play and delayed play
        attemptPlay()
        setTimeout(() => {
          if (!isPlaying && !isMuted) {
            persistentPlay()
          }
        }, 200)
      }
    }
  }, [audioInitialized, isMuted, persistentPlay, isPlaying])

  // Direct page change function
  const changePage = useCallback(
    (newPage: number) => {
      if (isScrollingRef.current) return

      // Wrap around: if trying to go beyond page 3, wrap to page 0
      if (newPage > 3) {
        newPage = 0
      }
      // Wrap around: if trying to go before page 0, wrap to page 3
      if (newPage < 0) {
        newPage = 3
      }

      // Specific logic for page 1 sub-sections
      if (currentPage === 1 && newPage === 2 && page2SubSection < 2) {
        // If trying to go from page 1 to page 2, but not on the last sub-section of page 1, prevent
        return
      }
      if (currentPage === 2 && newPage === 1) {
        // If going from page 2 (globe) back to page 1, set to last sub-section of page 1
        setPage2SubSection(2)
      } else if (newPage === 1 && currentPage !== 2) {
        // If navigating to page 1 from page 0, reset sub-section to 0
        setPage2SubSection(0)
      }

      if (newPage === currentPage) return

      isScrollingRef.current = true
      setIsTransitioning(true)
      setCurrentPage(newPage)

      setTimeout(() => {
        isScrollingRef.current = false
        setIsTransitioning(false)
      }, 3500)
    },
    [currentPage, page2SubSection],
  )

  // Handle sub-sections within page 2
  const handlePage2Scroll = useCallback(
    (direction: "down" | "up") => {
      if (currentPage !== 1) return false

      if (direction === "down") {
        if (page2SubSection < 2) {
          isScrollingRef.current = true
          setIsPage2SubTransition(true)
          setPage2SubSection((prev) => prev + 1)
          setTimeout(() => {
            isScrollingRef.current = false
            setIsPage2SubTransition(false)
          }, 3500)
          return true
        } else {
          changePage(2)
          return true
        }
      } else if (direction === "up") {
        if (page2SubSection > 0) {
          isScrollingRef.current = true
          setIsPage2SubTransition(true)
          setPage2SubSection((prev) => prev - 1)
          setTimeout(() => {
            isScrollingRef.current = false
            setIsPage2SubTransition(false)
          }, 3500)
          return true
        } else {
          changePage(0)
          return true
        }
      }

      return false
    },
    [currentPage, page2SubSection, changePage],
  )

  // Event handlers
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      initializeAudio()

      const now = Date.now()
      if (now - lastWheelTime.current < 1200) return
      lastWheelTime.current = now

      if (isScrollingRef.current) return

      const direction = e.deltaY > 0 ? "down" : "up"

      if (currentPage === 1) {
        const handled = handlePage2Scroll(direction)
        if (handled) return
      }

      if (direction === "down") {
        changePage(currentPage + 1)
      } else {
        changePage(currentPage - 1)
      }
    },
    [currentPage, handlePage2Scroll, changePage, initializeAudio],
  )

  const touchStart = useRef<number>(0)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      initializeAudio()
      touchStart.current = e.touches[0].clientY
    },
    [initializeAudio],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (isScrollingRef.current) return

      const touchEnd = e.changedTouches[0].clientY
      const diff = touchStart.current - touchEnd

      if (Math.abs(diff) > 50) {
        const direction = diff > 0 ? "down" : "up"

        if (currentPage === 1) {
          const handled = handlePage2Scroll(direction)
          if (handled) return
        }

        if (direction === "down") {
          changePage(currentPage + 1)
        } else {
          changePage(currentPage - 1)
        }
      }
    },
    [currentPage, handlePage2Scroll, changePage],
  )

  const handleMouseMove = useCallback(() => {
    initializeAudio()
  }, [initializeAudio])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      initializeAudio()

      if (isScrollingRef.current) return

      let direction: "down" | "up" | null = null

      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault()
          direction = "down"
          break
        case "ArrowUp":
        case "PageUp":
          e.preventDefault()
          direction = "up"
          break
        case "Home":
          e.preventDefault()
          changePage(0)
          setPage2SubSection(0)
          return
        case "End":
          e.preventDefault()
          changePage(4)
          return
      }

      if (direction) {
        if (currentPage === 1) {
          const handled = handlePage2Scroll(direction)
          if (handled) return
        }

        if (direction === "down") {
          changePage(currentPage + 1)
        } else {
          changePage(currentPage - 1)
        }
      }
    },
    [currentPage, handlePage2Scroll, changePage, initializeAudio],
  )

  const handlePageClick = useCallback(() => {
    initializeAudio()
  }, [initializeAudio])

  useEffect(() => {
    if (!showHzTooltip) return

    const closeTooltipOnOutsideTap = (event: PointerEvent) => {
      if (audioControlRef.current?.contains(event.target as Node)) {
        return
      }
      setShowHzTooltip(false)
    }

    window.addEventListener("pointerdown", closeTooltipOnOutsideTap)
    return () => window.removeEventListener("pointerdown", closeTooltipOnOutsideTap)
  }, [showHzTooltip])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const handleSearchSubmit = useCallback((_query: string) => {
    // Reserved for future analytics-free submission handling.
  }, [])

  const handleSearchResult = useCallback((result: any) => {
    setSearchResult(result)
    // Automatically navigate to page 3 (globe section) when search completes
    changePage(2)
  }, [])

  useEffect(() => {
    document.body.style.overflow = "hidden"

    window.addEventListener("wheel", handleWheel, { passive: false })
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchend", handleTouchEnd, { passive: false })
    window.addEventListener("keydown", handleKeyDown, { passive: false })
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("click", handlePageClick, { passive: true })

    return () => {
      document.body.style.overflow = "auto"
      window.removeEventListener("wheel", handleWheel)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handlePageClick)

      // Clean up timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [handleWheel, handleTouchStart, handleTouchEnd, handleKeyDown, handleMouseMove, handlePageClick])

  useEffect(() => {
    if (searchResult && globeRef.current) {
      try {
        // Send the complete search result including coordinates array and arcs data
        const globeData = {
          type: "MANIFESTATION_DATA",
          data: {
            ...searchResult,
            // Ensure coordinates are properly formatted
            coordinates: searchResult.coordinates || [],
            arcsData: searchResult.arcsData || [],
            // Include the full webhook response if available
            webhookData: searchResult.webhookData || null,
          },
        }
        const targetOrigin = new URL(globeRef.current.src).origin

        globeRef.current.contentWindow?.postMessage(globeData, targetOrigin)
      } catch {
      }
    }
  }, [searchResult])

  // Listen for messages from the globe iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!globeRef.current?.src) return
      const expectedOrigin = new URL(globeRef.current.src).origin
      if (event.origin !== expectedOrigin) return

      // Check if the message is from the globe iframe
      if (event.data && event.data.type === "GLOBE_READY") {
        // If we already have search results, send them again
        if (searchResult && globeRef.current) {
          const globeData = {
            type: "MANIFESTATION_DATA",
            data: {
              ...searchResult,
              coordinates: searchResult.coordinates || [],
              arcsData: searchResult.arcsData || [],
              webhookData: searchResult.webhookData || null,
            },
          }
          const targetOrigin = new URL(globeRef.current.src).origin

          globeRef.current.contentWindow?.postMessage(globeData, targetOrigin)
        }
      }
    }

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [searchResult])

  // Show cinematic message above globe when arcs complete
  const [showManifestModal, setShowManifestModal] = useState(false)
  const [globeMessageArcCount, setGlobeMessageArcCount] = useState(1)

  useEffect(() => {
    if (searchResult?.arcsData && searchResult.arcsData.length > 0) {
      const arcCount = searchResult.arcsData.length
      const msPerArc = 4000 // ms per arc
      const triggerTime = arcCount * msPerArc // modal fires exactly when counter reaches arcCount

      // Reset counter to 1 at start
      setGlobeMessageArcCount(1)

      const countingInterval = setInterval(() => {
        setGlobeMessageArcCount((prev) => {
          if (prev < arcCount) {
            return prev + 1
          } else {
            clearInterval(countingInterval)
            return arcCount
          }
        })
      }, msPerArc)

      const timer = setTimeout(() => {
        setShowManifestModal(true)
      }, triggerTime)

      return () => {
        clearTimeout(timer)
        clearInterval(countingInterval)
      }
    }
  }, [searchResult])

  const getGlobeUrl = () => {
    const baseUrl = "/globe.html"

    if (searchResult) {
      const params = new URLSearchParams()

      // Add basic manifestation data
      if (searchResult.query) {
        params.set("manifestation", encodeURIComponent(searchResult.query))
      }
      if (searchResult.response) {
        params.set("response", encodeURIComponent(searchResult.response))
      }
      if (searchResult.timestamp) {
        params.set("timestamp", searchResult.timestamp)
      }

      // Add coordinates if available
      if (searchResult.coordinates && Array.isArray(searchResult.coordinates) && searchResult.coordinates.length > 0) {
        params.set("coordinates", JSON.stringify(searchResult.coordinates))
      }

      // Add arcs data if available - this is the key part for arc visualization
      if (searchResult.arcsData && Array.isArray(searchResult.arcsData) && searchResult.arcsData.length > 0) {
        params.set("arcs", JSON.stringify(searchResult.arcsData))
      }

      const finalUrl = `${baseUrl}?${params.toString()}`
      return finalUrl
    }

    return baseUrl
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Database Setup Banner */}
      <DatabaseSetupBanner />

      {/* Audio Element */}
      <audio
        key={`${songs[currentSongIndex]}-${currentSongIndex}`}
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        playsInline
      >
        <source src={songs[currentSongIndex]} type="audio/mpeg" />
        <source src={songs[currentSongIndex]} type="audio/wav" />
        <source src={songs[currentSongIndex]} type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>

      {/* Audio Control */}
      <div
        ref={audioControlRef}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 z-50 flex items-center space-x-1 md:bottom-4 md:left-auto md:right-4 md:space-x-2"
      >
        <button
          onClick={toggleMute}
          className="rounded-full border-0 bg-transparent p-2 shadow-none backdrop-blur-none transition-opacity duration-300 hover:bg-transparent hover:opacity-100"
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute background sound" : "Mute background sound"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white opacity-80 md:h-5 md:w-5 md:opacity-70" />
          ) : (
            <Volume2 className="h-4 w-4 text-white opacity-80 md:h-5 md:w-5 md:opacity-70" />
          )}
        </button>
        <div className="relative hidden md:block md:group">
          <button
            onClick={() => setShowHzTooltip(!showHzTooltip)}
            className="text-white text-xs md:text-sm font-medium opacity-70 cursor-help bg-transparent border-none"
          >
            432 Hz
          </button>
          <div className={`absolute bottom-full right-0 mb-2 w-48 md:w-64 p-2 md:p-3 bg-black bg-opacity-90 text-white text-[10px] md:text-xs rounded-lg shadow-lg transition-all duration-300 z-50 border border-white border-opacity-20 ${showHzTooltip ? 'opacity-100 visible' : 'opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible'}`}>
            <div className="font-semibold mb-1">Why 432 Hz?</div>
            <div className="text-xs leading-relaxed">
              432 Hz is known as the natural healing frequency. It helps cleanse negative energy, bringing your mind and
              body back into balance. As you listen, it aligns you with the natural rhythms of the universe, amplifying
              the energy within and around you. This frequency doesn't just calm—it strengthens your manifesting power
              by raising your vibration to a higher state, making it perfect for manifesting and energy sharing.
            </div>
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black border-t-opacity-90"></div>
          </div>
        </div>
      </div>

      {/* Darkening Transition Overlay */}
      {isTransitioning && !isPage2SubTransition && <div className="fixed inset-0 bg-black transition-darkening z-50" />}

      {/* Container with individual positioned pages */}
      <div ref={containerRef} className="w-full h-screen">
        {/* Page 1 - Main Content */}
        <section
          className={`fixed inset-0 flex flex-col items-center justify-center px-4 overflow-hidden transition-3s ${currentPage === 0
              ? "opacity-100 z-20 blur-0"
              : "opacity-0 z-10 pointer-events-none blur-md"
            }`}
          style={{ paddingTop: databaseReady ? "0" : "60px" }} // Add padding when banner is shown
        >
          {/* Auth Buttons - Top Right */}
          <div className="absolute top-4 right-4 md:top-6 md:right-6 z-30 flex items-center space-x-2 md:space-x-3">
            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <span className="text-white text-xs md:text-sm opacity-80 hidden sm:block">Welcome, {userName || "User"}</span>
                <Button
                  onClick={signOut}
                  variant="ghost"
                  className="text-white border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 hover:border-opacity-50 px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base rounded-full font-medium transition-all duration-300"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setAuthMode("signin")
                    setAuthModalOpen(true)
                    initializeAudio()
                  }}
                  variant="ghost"
                  className="text-white border border-transparent hover:border-white hover:border-opacity-50 hover:bg-white hover:bg-opacity-10 px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base rounded-full font-medium transition-all duration-300"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    setAuthMode("signup")
                    setAuthModalOpen(true)
                    initializeAudio()
                  }}
                  className="bg-transparent border border-transparent hover:border-white hover:border-opacity-50 hover:bg-white hover:bg-opacity-10 text-white px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base rounded-full font-medium transition-all duration-300 transform hover:scale-105"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Local videos keep the rotating Earth moving in embedded previews. */}
          <div className="absolute inset-0 w-full h-full z-0">
            <TimeAwareMobileHeroVideo />
            <video
              className="absolute inset-0 hidden h-full w-full bg-black object-cover md:block"
              src="/videos/hero-day.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            />
          </div>

          {/* Progressive darkness overlay */}
          <div className="absolute inset-0 page-darkness-1 z-1"></div>

          {/* Content Container */}
          <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-4xl px-4 md:px-8">
            {/* Interactive Particle Text */}
            <div className="w-full h-32 sm:h-40 md:h-48 lg:h-64 mb-4 md:mb-8">
              <ParticleText text="Manifestchain" className="w-full h-full" />
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-xl md:max-w-2xl">
                <ManifestationSearch
                value={searchQuery}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
                onSearchResult={handleSearchResult}
                className="w-full"
                resetKey={manifestationResetKey}
                useComplete108Hook={useComplete108Hook}
                onHookComplete={() => {
                  setUseComplete108Hook(false)
                }}
                onOpenPayment={(productId) => {
                  setSelectedProductId(productId)
                  setPaymentModalOpen(true)
                }}
              />
            </div>
          </div>
        </section>

        {/* Page 2 - Earth from Space */}
        <section
          className={`fixed inset-0 overflow-hidden transition-3s ${currentPage === 1
              ? "opacity-100 z-20 blur-0"
              : "opacity-0 z-10 pointer-events-none blur-md"
            }`}
        >
          {/* Video Background */}
          <div className="absolute inset-0 w-full h-full z-0">
            <video
              className="absolute inset-0 h-full w-full bg-black object-cover"
              src="/videos/hero-night.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            />
          </div>

          {/* Progressive darkness overlay */}
          <div className="absolute inset-0 page-darkness-2 z-1"></div>

          {/* Section 1: Supercharge Your Manifestation Energy */}
          <div
            className={`absolute inset-0 z-10 flex items-center justify-start px-4 sm:px-6 transition-3s ${page2SubSection === 0 ? "opacity-100 visible blur-0" : "opacity-0 invisible blur-md"
              }`}
          >
            <div className="max-w-2xl ml-2 sm:ml-8 md:ml-16">
              <div
                className={`transition-3s-content ${page2SubSection === 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                style={{ transitionDelay: page2SubSection === 0 ? "800ms" : "0ms" }}
              >
                <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 md:mb-12 drop-shadow-lg font-serif">
                  What is ManifestChain?
                </h3>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white opacity-90 mb-4 sm:mb-6 md:mb-8 leading-relaxed drop-shadow-md font-light">
                  Every wish is energy. But most wishes die alone.
                </p>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white opacity-75 mb-4 sm:mb-6 leading-relaxed drop-shadow-md font-light">
                  ManifestChain is the world's first spiritual ritual that lets your wish travel across the Earth
                  carried by the hands, hearts, and intentions of others. Together, we form a karmic cycle of giving and
                  receiving, which will supercharge the energy of your wish like never been before.
                </p>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white opacity-75 mb-4 sm:mb-6 leading-relaxed drop-shadow-md font-light">
                  It's not an app. It's a living chain of intention. A global prayer wheel that never breaks.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Cleanse Your Energy, the Sacred Way */}
          <div
            className={`absolute inset-0 z-10 flex items-center justify-start px-4 sm:px-6 transition-3s ${page2SubSection === 1 ? "opacity-100 visible blur-0" : "opacity-0 invisible blur-md"
              }`}
          >
            <div className="max-w-2xl ml-2 sm:ml-8 md:ml-16 relative">
              <div
                className={`transition-3s-content ${page2SubSection === 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                style={{ transitionDelay: page2SubSection === 1 ? "800ms" : "0ms" }}
              >
                <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 md:mb-12 drop-shadow-lg font-serif">
                  How does it work?
                </h3>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white opacity-90 mb-4 sm:mb-6 md:mb-8 leading-relaxed drop-shadow-md font-light">
                  To enter the circle, you must first carry someone else's manifest. As others will carry yours.
                </p>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white opacity-75 mb-4 sm:mb-6 leading-relaxed drop-shadow-md font-light">
                  Each manifest travels through 108 people across the globe, a number chosen for its sacred resonance.
                  Every intention, recognition, even the act of writing your wish in 108 different locations will give
                  additional energy to your wish. The AI guides this journey, forming a spinning route around the Earth,
                  inspired by ancient Tibetan prayer wheels cleansing bad karma, amplifying positive energy.
                </p>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white opacity-75 mb-4 sm:mb-6 leading-relaxed drop-shadow-md font-light">
                  When your manifest returns to you, it's purified, empowered, and ready to be released to the universe.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Complete the Sacred Circle & Release the Power */}
          <div
            className={`absolute inset-0 z-10 flex items-center justify-start px-4 sm:px-6 transition-3s ${page2SubSection === 2 ? "opacity-100 visible blur-0" : "opacity-0 invisible blur-md"
              }`}
          >
            <div className="max-w-2xl ml-2 sm:ml-8 md:ml-16">
              <div
                className={`transition-3s-content ${page2SubSection === 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                style={{ transitionDelay: page2SubSection === 2 ? "800ms" : "0ms" }}
              >
                <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 md:mb-12 drop-shadow-lg font-serif">
                  Why 108? What is a Prayerwheel?
                </h3>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white opacity-90 mb-4 sm:mb-6 md:mb-8 leading-relaxed drop-shadow-md font-light">
                  For centuries, monks have used prayer wheels — spinning them to release intention. We've brought this
                  ancient power into the digital world.
                </p>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white opacity-75 mb-4 sm:mb-6 leading-relaxed drop-shadow-md font-light">
                  Your wish is written 108 times in 108 unique locations, witnessed and energized by 108 souls. Every
                  spin of the globe isn't just animation — it's a sacred act of purification.
                </p>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl drop-shadow-md font-medium text-white mb-4">
                  ManifestChain channels that same logic to elevate your wish into its highest, purest form.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Page 3 - Globe Section */}
        <section
          className={`globe-viewport fixed inset-0 flex flex-col items-center justify-center bg-black transition-3s ${currentPage === 2
              ? "opacity-100 z-20 scale-100 blur-0"
              : "opacity-0 z-10 pointer-events-none blur-md"
            }`}
          style={{ width: "100vw", height: "100dvh", minHeight: "100svh", overflow: "hidden" }}
        >
          {/* Progressive darkness overlay - darkest page */}
          <div className="absolute inset-0 page-darkness-3 z-1"></div>

          {/* Search Result Indicator */}
          {searchResult && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 bg-black bg-opacity-70 rounded-lg p-2 md:p-3 max-w-[200px] md:max-w-sm pointer-events-none">
              <div className="text-green-400 text-xs md:text-sm font-medium mb-1">Manifestation Active</div>
              <div className="text-white text-[10px] md:text-xs opacity-80 truncate">{searchResult.query}</div>
              {searchResult.coordinates && searchResult.coordinates.length > 0 && (
                <div className="text-blue-400 text-[10px] md:text-xs opacity-80 mt-1">
                  {searchResult.coordinates.length} locations connected
                </div>
              )}
              {searchResult.arcsData && searchResult.arcsData.length > 0 && (
                <div className="text-purple-400 text-[10px] md:text-xs opacity-80 mt-1">
                  {globeMessageArcCount > 0 ? globeMessageArcCount : "?"} energy arcs flowing
                </div>
              )}
            </div>
          )}

          {showManifestModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 pt-6 backdrop-blur-sm sm:items-center sm:p-4">
              <div
                className="relative z-20 max-h-[calc(100svh-2rem)] w-full max-w-sm overflow-y-auto sm:max-w-md md:max-w-lg"
                onClick={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchEnd={(event) => event.stopPropagation()}
              >
                {(searchResult?.arcsData?.length ?? 0) >= 108 ? (
                  /* Green Box: Full Circle Complete (108 arcs) */
                  <div
                    className={`w-full border-0 p-0 overflow-hidden backdrop-blur-xl rounded-lg bg-gradient-to-b from-green-950/40 to-black/40`}
                  >
                    <div
                      className={`absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(20,83,45,0.2)_70%,rgba(5,46,22,0.4)_100%)]`}
                    />

                    <div
                      className={`absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_40px_rgba(34,197,94,0.4),0_0_50px_rgba(34,197,94,0.3)]`}
                    >
                      {/* Corner decorations */}
                      <div
                        className={`absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 rounded-tl-lg border-amber-500`}
                      />
                      <div
                        className={`absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 rounded-tr-lg border-amber-500`}
                      />
                      <div
                        className={`absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 rounded-bl-lg border-amber-500`}
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 rounded-br-lg border-amber-500`}
                      />

                      {/* Bottom center diamond */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                        <div className={`w-4 h-4 rotate-45 bg-amber-500 shadow-lg`} />
                      </div>
                    </div>

                    <div className="relative p-4 md:p-5 pt-3 md:pt-4">
                      <div
                        className={`text-center text-[8px] md:text-[10px] font-bold tracking-widest uppercase mb-3 md:mb-4 flex items-center justify-center gap-1 text-green-400`}
                      >
                        <span>→</span>
                        <span className="hidden sm:inline">MANIFEST CHAMBER — FULL CIRCLE COMPLETE</span>
                        <span className="sm:hidden">FULL CIRCLE COMPLETE</span>
                        <span>←</span>
                      </div>

                      <h3 className={`text-xl md:text-2xl font-serif text-center mb-3 md:mb-4 leading-tight text-amber-100`}>
                        Your Manifest Completed
                        <br />
                        108 Arcs
                      </h3>

                      {/* Diamond divider */}
                      <div className="flex justify-center mb-4">
                        <div className={`w-2 h-2 rotate-45 bg-amber-500`} />
                      </div>

                      <div className="text-center space-y-2 mb-4 text-gray-100">
                        <p className="text-sm">
                          Your manifest formed a full circle with
                          <br />
                          <span className="text-amber-400 font-semibold">108 carriers around the world</span>.
                        </p>
                        <div className="flex justify-center my-1">
                          <div className="w-1.5 h-1.5 rotate-45 bg-amber-500/60" />
                        </div>
                        <p className="text-xs opacity-90">
                          Your manifest is now sealed in its
                          <br />
                          most powerful, pure, and sacred form.
                        </p>
                      </div>

                      <div className="flex justify-center my-3">
                        <div className="relative w-48 h-32">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <img
                              src="/images/golden-ring.png"
                              alt="Sacred Golden Ring"
                              className="w-full h-full object-contain animate-pulse drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                            />
                          </div>
                          {/* Particle effects */}
                          <div className="absolute inset-0 overflow-hidden">
                            {[...Array(8)].map((_, i) => (
                              <div
                                key={i}
                                className="absolute w-1 h-1 bg-amber-400 rounded-full animate-ping"
                                style={{
                                  left: `${20 + Math.random() * 60}%`,
                                  top: `${20 + Math.random() * 60}%`,
                                  animationDelay: `${i * 0.2}s`,
                                  animationDuration: "2s",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex-col gap-2 mt-1">
                        <Button
                          onClick={() => setSendToUniverseOpen(true)}
                          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold py-4 text-sm rounded-lg shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all border-2 border-amber-500/50"
                        >
                          Send it to universe
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Red Box: Partially Formed (< 108 arcs) */
                  <div
                    className={`border-0 p-0 overflow-hidden backdrop-blur-xl rounded-lg bg-gradient-to-b from-red-950/40 to-black/40`}
                  >
                    <div
                      className={`absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(69,10,10,0.2)_70%,rgba(127,29,29,0.4)_100%)]`}
                    />

                    <div
                      className={`absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_40px_rgba(127,29,29,0.5),0_0_50px_rgba(153,27,27,0.4)]`}
                    >
                      {/* Corner decorations */}
                      <div
                        className={`absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 rounded-tl-lg border-red-700`}
                      />
                      <div
                        className={`absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 rounded-tr-lg border-red-700`}
                      />
                      <div
                        className={`absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 rounded-bl-lg border-red-700`}
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 rounded-br-lg border-red-700`}
                      />

                      {/* Bottom center diamond */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                        <div className={`w-4 h-4 rotate-45 bg-red-700 shadow-lg`} />
                      </div>
                    </div>

                    <div className="relative p-4 md:p-5 pt-3 md:pt-4 pb-5 md:pb-6 my-2">
                      <div
                        className={`text-center text-[8px] md:text-[10px] font-bold tracking-widest uppercase mb-3 md:mb-4 flex items-center justify-center gap-1 text-red-400`}
                      >
                        <span>→</span>
                        <span className="hidden sm:inline">MANIFEST CHAMBER — PARTIALLY FORMED</span>
                        <span className="sm:hidden">PARTIALLY FORMED</span>
                        <span>←</span>
                      </div>

                      <h3 className={`text-xl md:text-2xl font-serif text-center mb-3 md:mb-4 leading-tight text-red-300`}>
                        Your Manifest Chamber
                        <br />
                        Is Sealed
                      </h3>

                      {/* Diamond divider */}
                      <div className="flex justify-center mb-4">
                        <div className={`w-2 h-2 rotate-45 bg-red-600`} />
                      </div>

                      <div className="text-center space-y-2 mb-4 text-gray-100">
                        <p className="text-sm">
                          You carried the energy across <span className="text-red-400 font-semibold">{globeMessageArcCount} arcs</span>.
                        </p>
                        <p className="text-xs opacity-90">
                          Each arc amplified your intention, but
                          <br />
                          the chamber stopped before reaching its sacred completion.
                        </p>
                        <div className="flex flex-col items-center gap-1 my-1">
                          <div className="w-1.5 h-1.5 rotate-45 bg-red-600/60" />
                        </div>
                        <p className="text-xs">
                          The most powerful form is <span className="text-red-400 font-semibold">108 arcs</span> —
                          <br />
                          the number used to send a manifest fully into the universe.
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-2 py-0 px-0 my-0">
                        <div className="relative w-48 h-32">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <img
                              src="/images/golden-ring.png"
                              alt="Sacred Ring"
                              className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse"
                            />
                          </div>
                          {/* Arc count overlay - transparent background */}
                          <div className="absolute inset-0 flex items-center justify-center mt-0 pt-3 pl-1.5 pb-0 pr-0">
                            <div className="text-xl font-mono text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                              {globeMessageArcCount} / 108
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full mt-1">
                        <Button
                          onClick={() => {
                            setSelectedProductId("prod_Twmap5w4jDWJhi")
                            setPaymentModalOpen(true)
                            setShowManifestModal(false)
                          }}
                          className="w-full bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 text-xs rounded-lg shadow-[0_0_10px_rgba(34,197,94,0.3)] hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all border border-green-600/50"
                        >
                          Complete 108 Arcs Guarantee - $9.99
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedProductId("prod_TwmTvTgS4ELVyu")
                            setPaymentModalOpen(true)
                            setShowManifestModal(false)
                          }}
                          className="w-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 text-xs rounded-lg shadow-[0_0_10px_rgba(251,191,36,0.3)] hover:shadow-[0_0_15px_rgba(251,191,36,0.5)] transition-all border border-amber-600/50"
                        >
                          One More Try - $1.99
                        </Button>
                        <Button
                          onClick={() => {
                            setShowManifestModal(false)
                          }}
                          variant="ghost"
                          className="w-full text-red-400/80 hover:text-red-300 py-2 text-xs hover:bg-red-950/30 rounded-lg border border-red-700/30 hover:border-red-600/50 transition-all"
                        >
                          Leave Chamber As Is
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {searchResult && searchResult.carriers && searchResult.carriers.length > 0 && (
            <CarrierMessages carriers={searchResult.carriers} arcDuration={2000} />
          )}

          {/* Globe Container */}
          <div
            className="globe-frame-shell absolute inset-0 z-10"
            style={{ width: "100vw", height: "100dvh", minHeight: "100svh", overflow: "hidden" }}
          >
            <iframe
              ref={globeRef}
              src={getGlobeUrl()}
              className="globe-frame pointer-events-auto scale-[0.92] md:scale-100"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                minWidth: "100vw",
                minHeight: "100svh",
                border: 0,
                touchAction: "none",
                transformOrigin: "center center",
              }}
              title="Interactive Globe Visualization"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          </div>

          {/* Navigation Buttons for Page 3 */}
          <div className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end space-y-2">
            {/* Up Button */}
            <button
              onClick={() => changePage(currentPage - 1)}
              className="bg-transparent hover:bg-white/10 rounded-full p-1.5 md:p-2 transition-all duration-300"
              title="Previous Page"
              disabled={isScrollingRef.current}
            >
              <ChevronUp className="w-5 h-5 md:w-6 md:h-6 text-white opacity-70" />
            </button>
            {/* Down Button */}
            <button
              onClick={() => changePage(currentPage + 1)}
              className="bg-transparent hover:bg-white/10 rounded-full p-1.5 md:p-2 transition-all duration-300"
              title="Next Page"
              disabled={isScrollingRef.current}
            >
              <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-white opacity-70" />
            </button>
          </div>
        </section>

        {/* Page 3 - Call to Action / About Us */}
        <section
          className={`fixed inset-0 flex flex-col items-center justify-center px-4 overflow-hidden transition-3s ${currentPage === 3
              ? "opacity-100 z-20 scale-100 blur-0"
              : "opacity-0 z-10 pointer-events-none blur-md"
            }`}
        >
          {/* Background for Page 3 - image background */}
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('/images/20250714-1237-explorer-20interviewing-20monk-remix-01k04170v7e6yt0w1wyx0v3khh.jpeg')`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center center",
            }}
          ></div>
          <div className="absolute inset-0 page-darkness-3 z-1"></div> {/* Keep consistent darkness overlay */}
          <div className="relative z-20 flex max-w-3xl px-4 md:px-8 md:ml-8 lg:ml-[-723px] text-center font-mono flex-col justify-end items-start">
            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-8 drop-shadow-lg">About Us</h3>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white opacity-90 mb-4 md:mb-6 leading-relaxed drop-shadow-md font-light text-left">
              We are three friends on a journey to understand life and its deeper meaning. After visiting Tibetan monks
              and spending time in their tranquil environment, we were deeply inspired by their wisdom, especially the
              ancient practices of energy, prayer wheels, and manifestation.
            </p>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white opacity-90 mb-4 md:mb-6 leading-relaxed drop-shadow-md font-light text-left">
              What we learned there changed how we see the world: the power of collective energy and intention. This
              inspired us to create this platform—a digital space where people from all over the world can contribute
              their energy and amplify their manifestations together.
            </p>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white opacity-90 mb-8 md:mb-12 leading-relaxed drop-shadow-md font-light text-left">
              Our goal is simple: to bring an ancient practice into the modern world and help more people send their
              wishes into the universe in a more powerful and connected way.
            </p>
            <div className="mt-8">
              <div className="flex space-x-4 justify-start">
                {" "}
                {/* Changed justify-center to justify-start */}
                <a
                  href="#"
                  className="text-white hover:text-blue-400 transition-colors duration-300"
                  aria-label="Join us on Discord"
                ></a>
                <a
                  href="#"
                  className="text-white hover:text-blue-400 transition-colors duration-300"
                  aria-label="Follow us on Twitter"
                ></a>
                <a
                  href="#"
                  className="text-white hover:text-blue-400 transition-colors duration-300"
                  aria-label="Visit our website"
                ></a>
              </div>
            </div>
          </div>
          <div className="hidden md:flex fixed bottom-8 right-8 z-30 gap-4">
            {/* Box 2 - Partially Formed (<108 arcs) - Hidden on mobile */}
            <div className="w-64 lg:w-80 border-0 p-0 overflow-hidden backdrop-blur-xl bg-gradient-to-b from-red-950/40 to-black/40 rounded-lg">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(69,10,10,0.2)_70%,rgba(127,29,29,0.4)_100%)]" />

              <div className="absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_60px_rgba(127,29,29,0.5),0_0_80px_rgba(153,27,27,0.4)]">
                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 rounded-tl-lg border-red-700" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 rounded-tr-lg border-red-700" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 rounded-bl-lg border-red-700" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 rounded-br-lg border-red-700" />

                {/* Bottom center diamond */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                  <div className="w-6 h-6 rotate-45 bg-red-700 shadow-lg" />
                </div>
              </div>


            </div>
          </div>
          {/* Copyright notice */}
          <div className="fixed bottom-4 left-0 right-0 z-30 text-center">
            <p className="text-xs text-gray-400/60 font-sans">
              &copy; Fugazi Studios LLC. All rights reserved.
            </p>
          </div>
          {/* Feedback Button - Only visible on last page */}
          {currentPage === 3 && <FeedbackButton />}
          {/* Navigation Buttons for Page 3 */}
          <div className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end space-y-2">
            {/* Up Button */}
            <button
              onClick={() => changePage(0)}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 md:p-3 transition-all duration-300 shadow-lg"
              title="Go to First Page"
              disabled={isScrollingRef.current}
            >
              <ChevronsUpIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
          </div>
        </section>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      {/* Send to Universe Effect */}
      <SendToUniverseEffect
        isOpen={sendToUniverseOpen}
        onClose={() => setSendToUniverseOpen(false)}
        onConfirm={() => {
          setSendToUniverseOpen(false)
        }}
        onNavigateToPage={() => {
          changePage(0)
          setPage2SubSection(0)
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        productId={selectedProductId}
        onClose={() => {
          setPaymentModalOpen(false)
          setSelectedProductId("")
        }}
        onSuccess={async (action) => {
          try {
            await refreshUserProfile()

            if (action === "complete_108") {
              // Set the flag to use the complete108 hook
              setUseComplete108Hook(true)
              // Reset state for new manifestation
              setShowManifestModal(false)
              setSearchResult(null)
              setGlobeMessageArcCount(0)
              setManifestationResetKey((prev) => prev + 1)
              // Navigate to start page (page 0)
              changePage(0)
              toast({
                title: "Complete your 108-Chamber",
                description: "Enter your manifestation to complete the sacred 108 arcs",
                duration: 5000,
              })
            } else if (action === "one_more_try") {
              // Close the manifest modal (red/green box on globe page)
              setShowManifestModal(false)
              // Reset search state for new manifestation
              setSearchResult(null)
              setGlobeMessageArcCount(0)
              setManifestationResetKey((prev) => prev + 1)
              // Navigate back to start page
              changePage(0)
              toast({
                title: "One More Try Activated!",
                description: "You're ready for one more manifestation. Start typing your intention!",
                duration: 5000,
              })
            }
          } catch {
            toast({
              title: "Error",
              description: "There was an error processing your payment. Please try again.",
              duration: 5000,
            })
          }
        }}
      />

      <Toaster />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <HomeContent />
    </Suspense>
  )
}
