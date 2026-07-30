"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { AlertCircle, Calendar, Loader2, Lock, MapPin, Search, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useGeolocation } from "@/components/geolocation-provider"
import { getAccessToken } from "@/lib/supabase"

interface ManifestationSearchProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onSearchResult?: (result: any) => void
  className?: string
  resetKey?: number
  useComplete108Hook?: boolean
  onHookComplete?: () => void
  onOpenPayment?: (productId: string) => void
}

const fallbackSuggestions = [
  "Attract abundance into my life",
  "Find my perfect career path",
  "Manifest loving relationships",
  "Achieve financial freedom",
  "Create lasting happiness",
]

function readCoordinates(webhookData: any) {
  if (Array.isArray(webhookData)) return webhookData
  if (Array.isArray(webhookData?.locations)) return webhookData.locations
  if (Array.isArray(webhookData?.coordinates)) return webhookData.coordinates
  if (Array.isArray(webhookData?.data)) return webhookData.data
  return []
}

function readArcs(webhookData: any) {
  return Array.isArray(webhookData?.segments) ? webhookData.segments : []
}

function readCarriers(webhookData: any) {
  if (!Array.isArray(webhookData?.messages)) return []
  return webhookData.messages.map((msg: any) => ({
    name: msg.name || "Unknown",
    country: msg.country || "Unknown",
  }))
}

const ManifestationSearch = ({
  value,
  onChange,
  onSubmit,
  onSearchResult,
  className = "",
  resetKey = 0,
  useComplete108Hook = false,
  onHookComplete,
  onOpenPayment,
}: ManifestationSearchProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasManifested, setHasManifested] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [hasSelectedOption, setHasSelectedOption] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const {
    user,
    canManifest,
    lastManifestation: manifestLimit,
    bonusSearches,
    refreshUserProfile,
  } = useAuth()
  const { location, getCurrentLocation } = useGeolocation()

  useEffect(() => {
    setHasSelectedOption(false)
    setShowSuggestions(false)
    setSuggestions([])
    setSearchError(null)
    setShowThankYou(false)
    setSearching(false)
    setLoading(false)
    setHasManifested(false)
    onChange("")
  }, [resetKey, onChange])

  useEffect(() => {
    if (!canManifest && user) {
      setSearching(false)
      setLoading(false)
    }
  }, [canManifest, user])

  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 1) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const token = await getAccessToken()
      const response = await fetch("/api/make/suggestions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })
      const data = await response.json()
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : fallbackSuggestions)
    } catch {
      setSuggestions(fallbackSuggestions)
    } finally {
      setLoading(false)
    }
  }

  const pollForMessages = async (token: string, locationData: any, query: string, enrichedResult: any) => {
    let pollAttempts = 0
    const maxAttempts = 30

    const pollInterval = setInterval(async () => {
      pollAttempts += 1
      try {
        const messageResponse = await fetch("/api/make/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lat: locationData.latitude,
            lon: locationData.longitude,
            query: query.trim(),
          }),
        })

        if (messageResponse.ok) {
          const { data: messageData } = await messageResponse.json()
          const carriers = readCarriers(messageData)
          if (carriers.length > 0) {
            onSearchResult?.({
              ...enrichedResult,
              carriers,
            })
            clearInterval(pollInterval)
          }
        }
      } catch {
        // Keep polling until the limit; transient workflow delays are expected.
      }

      if (pollAttempts >= maxAttempts) {
        clearInterval(pollInterval)
      }
    }, 2000)
  }

  const pollManifestationJob = async (token: string, jobId: string) => {
    const maxAttempts = 90

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      const response = await fetch(`/api/make/manifestation/status?jobId=${encodeURIComponent(jobId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Manifestation status unavailable")
      }

      const statusBody = await response.json()
      if (statusBody.status === "completed") {
        return statusBody.data
      }

      if (statusBody.status === "failed") {
        throw new Error(statusBody.error || "Manifestation workflow failed")
      }
    }

    throw new Error("Manifestation workflow timed out")
  }

  const performSearch = async (query: string) => {
    setLoading(true)
    setSearching(true)
    setSearchError(null)

    try {
      let locationData = location

      if (!locationData) {
        locationData = await getCurrentLocation()
      }

      if (!locationData || !locationData.longitude || !locationData.latitude) {
        setSearchError("Location data is required. Please enable location permissions and try again.")
        return
      }

      const token = await getAccessToken()
      const webhookResponse = await fetch("/api/make/manifestation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: locationData.latitude,
          lon: locationData.longitude,
          query: query.trim(),
          mode: useComplete108Hook ? "complete_108" : "default",
        }),
      })

      if (!webhookResponse.ok) {
        if (webhookResponse.status === 402) {
          setSearchError("Payment required to complete the 108 arcs. Please complete checkout and try again.")
        } else if (webhookResponse.status === 403) {
          setSearchError("Your manifestation limit has been reached. Use One More Try to continue.")
        } else if (webhookResponse.status === 429) {
          setSearchError("Too many attempts. Please wait a moment and try again.")
        } else {
          setSearchError("Manifestation is taking longer than expected. Please try again.")
        }
        return
      }

      const workflowBody = await webhookResponse.json()
      const webhookData = workflowBody.jobId
        ? await pollManifestationJob(token, workflowBody.jobId)
        : workflowBody.data
      let coordinatesArray = readCoordinates(webhookData).filter((coord: any) => {
        const hasLat = coord && (typeof coord.lat === "number" || typeof coord.latitude === "number")
        const hasLng =
          coord && (typeof coord.lon === "number" || typeof coord.lng === "number" || typeof coord.longitude === "number")
        return hasLat && hasLng
      })
      let arcsData = readArcs(webhookData)
      let carriers = readCarriers(webhookData)
      const initialCarrierCount = carriers.length

      if (coordinatesArray.length > 0 && arcsData.length === 0) {
        arcsData = coordinatesArray
          .map((coord: any) => ({
            startLat: locationData.latitude,
            startLng: locationData.longitude,
            endLat: coord.lat ?? coord.latitude,
            endLng: coord.lon ?? coord.lng ?? coord.longitude,
            color: ["#FF5F6D", "#FFC371"],
          }))
          .filter((arc: any) => arc.endLat != null && arc.endLng != null)
      }

      const enrichedResult = {
        locations: [],
        coordinates: coordinatesArray,
        webhookData,
        location: locationData,
        arcsData,
        carriers,
        query,
      }

      if (carriers.length === 0 && arcsData.length > 0) {
        carriers = [{ name: "Energy Carrier", country: "Waiting for messages..." }]
        enrichedResult.carriers = carriers
      }

      onSearchResult?.(enrichedResult)
      setHasManifested(true)
      await refreshUserProfile()

      if (useComplete108Hook) {
        onHookComplete?.()
      }

      if (initialCarrierCount === 0) {
        await pollForMessages(token, locationData, query, enrichedResult)
      }
    } catch {
      setSearchError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasSelectedOption) {
      e.preventDefault()
      return
    }

    onChange(e.target.value)
    setSelectedIndex(-1)
    setSearchError(null)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasSelectedOption) {
      const allowedKeys = ["Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]
      if (!allowedKeys.includes(e.key)) {
        e.preventDefault()
        return
      }
    }

    if (!hasSelectedOption && showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
          break
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
          break
        case "Enter":
          e.preventDefault()
          if (selectedIndex >= 0) {
            handleSuggestionClick(suggestions[selectedIndex])
          }
          break
        case "Escape":
          setShowSuggestions(false)
          setSelectedIndex(-1)
          inputRef.current?.blur()
          break
      }
      return
    }

    if (hasSelectedOption && e.key === "Enter") {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!hasSelectedOption) {
      e.preventDefault()
    }
  }

  const handleInputFocus = () => {
    if (!hasSelectedOption) {
      setShowSuggestions(true)
      fetchSuggestions("manifestation suggestions")
    }
  }

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }, 200)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setHasSelectedOption(true)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setShowThankYou(true)

    setTimeout(() => {
      setShowThankYou(false)
    }, 3000)

    inputRef.current?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setSearchError("Please sign in to manifest your dreams")
      return
    }

    if (!canManifest && !useComplete108Hook) {
      const lastDate = manifestLimit ? new Date(manifestLimit).toLocaleDateString() : "Never"
      setSearchError(`You can only manifest once per month. Last manifestation: ${lastDate}`)
      return
    }

    if (!hasSelectedOption) {
      setSearchError("Please select a manifestation option first")
      return
    }

    if (!value.trim()) {
      setSearchError("Please enter your manifestation")
      return
    }

    onSubmit(value)
    setShowSuggestions(false)
    await performSearch(value)
  }

  const getNextManifestationDate = () => {
    if (!manifestLimit) return null
    const lastDate = new Date(manifestLimit)
    return new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  if (!user) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative flex">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Sign in to manifest your dreams..."
              disabled
              className="w-full py-4 text-white placeholder-gray-300 focus:outline-none transition-all duration-300 text-lg pl-0 pr-12 bg-transparent border-0 border-b-2 border-white/30 rounded-none opacity-50 cursor-not-allowed"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-white opacity-50" />
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/20 border rounded-full px-4 py-2 border-white/50">
            <Lock className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Sign in required to manifest</span>
          </div>
        </div>
      </div>
    )
  }

  if ((!canManifest && !useComplete108Hook) || hasManifested) {
    const nextDate = getNextManifestationDate()
    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative flex">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Monthly manifestation limit reached..."
              disabled
              className="w-full py-4 text-white placeholder-gray-300 focus:outline-none transition-all duration-300 text-lg pl-0 pr-12 bg-transparent border-0 border-b-2 border-white/30 rounded-none opacity-50 cursor-not-allowed"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-white opacity-50" />
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-orange-500/20 border border-orange-400/50 rounded-full px-4 py-2 max-w-md mx-auto">
            <Calendar className="w-4 h-4 text-orange-300 flex-shrink-0" />
            <span className="text-orange-200 text-sm font-medium text-center">
              {nextDate ? `Next manifestation available: ${nextDate.toLocaleDateString()}` : "Monthly limit reached"}
            </span>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-200 text-sm">
                You have reached your monthly manifestation limit.
                {manifestLimit && (
                  <span className="block mt-1">
                    Last manifestation: {new Date(manifestLimit).toLocaleDateString()}
                  </span>
                )}
              </p>
              {bonusSearches > 0 && (
                <p className="text-amber-300 text-sm mt-2 font-medium">
                  You have {bonusSearches} bonus {bonusSearches === 1 ? "search" : "searches"} available!
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button
              onClick={() => onOpenPayment?.("prod_Twmap5w4jDWJhi")}
              className="flex-1 py-2 px-3 md:px-4 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
            >
              Complete 108 Arcs Guarantee - $9.99
            </button>
            <button
              onClick={() => onOpenPayment?.("prod_TwmTvTgS4ELVyu")}
              className="flex-1 py-2 px-3 md:px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 text-xs md:text-sm"
            >
              One More Try - $1.99
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onPaste={handleInputPaste}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={hasSelectedOption ? "What do you want to manifest?" : "Select a manifest to carry first..."}
              readOnly={!hasSelectedOption}
              disabled={searching}
              className={`w-full py-3 md:py-4 text-white placeholder-gray-300 focus:outline-none transition-all duration-300 text-base md:text-lg pl-0 pr-10 md:pr-12 bg-transparent border-0 border-b-2 border-white/30 rounded-none focus:border-white pb-2 ${
                !hasSelectedOption ? "cursor-pointer opacity-60" : ""
              } ${searching ? "opacity-50" : ""}`}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {loading && <Sparkles className="w-5 h-5 text-blue-400 animate-spin" />}
              {searching && <Loader2 className="w-5 h-5 text-green-400 animate-spin" />}
              {searchError && <AlertCircle className="w-5 h-5 text-red-400" />}
              {!loading && !searching && !searchError && <Search className="w-5 h-5 text-white opacity-50" />}
            </div>
          </div>
        </div>
      </form>

      {location && (
        <div className="mt-2 flex items-center justify-center">
          <div className="inline-flex items-center space-x-1 text-xs text-white opacity-60">
            <MapPin className="w-3 h-3" />
            <span>Location: {location.address || "Available"}</span>
          </div>
        </div>
      )}

      {searching && (canManifest || useComplete108Hook) && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/50 rounded-full px-4 py-2">
            <Loader2 className="w-4 h-4 text-blue-300 animate-spin" />
            <span className="text-blue-200 text-sm font-medium">Manifesting your vision...</span>
          </div>
        </div>
      )}

      {searchError && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-red-500/20 border border-red-400/50 rounded-full px-4 py-2 max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
            <span className="text-red-200 text-sm font-medium text-left">{searchError}</span>
          </div>
        </div>
      )}

      {showThankYou && !searching && !searchError && (
        <div className="mt-6 w-full">
          <div className="text-center py-6">
            <div className="inline-flex items-center space-x-2 bg-green-500/20 border border-green-400/50 rounded-full px-6 py-3">
              <Sparkles className="w-5 h-5 text-green-300 animate-pulse" />
              <span className="text-green-200 font-medium">Thanks for your aid</span>
              <Sparkles className="w-5 h-5 text-green-300 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {showSuggestions && !hasSelectedOption && !searching && (suggestions.length > 0 || loading) && (
        <div className="mt-6 w-full">
          {loading && suggestions.length === 0 ? (
            <div className="text-center py-4">
              <Sparkles className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-400" />
              <p className="text-sm text-gray-300 font-medium tracking-wider">Channeling manifestation energy...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium tracking-wider">
                  To join the circle you must carry someone's manifest first
                </p>
              </div>

              <div
                ref={suggestionsRef}
                className="flex gap-3 overflow-x-auto pb-3 px-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(96, 165, 250, 0.5) rgba(255, 255, 255, 0.1)",
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`flex-shrink-0 px-4 py-3 rounded-full border transition-all duration-300 group hover:scale-105 transform ${
                      index === selectedIndex
                        ? "bg-white/20 border-blue-400 border-2 shadow-lg shadow-blue-400/20"
                        : "bg-white/10 border-white/30 hover:bg-white/20 hover:border-white/50"
                    }`}
                    style={{
                      minWidth: "fit-content",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles
                        className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${
                          index === selectedIndex
                            ? "text-blue-300 animate-pulse"
                            : "text-blue-400 group-hover:animate-pulse"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium transition-all duration-300 ${
                          index === selectedIndex ? "text-white" : "text-gray-200 group-hover:text-white"
                        }`}
                      >
                        {suggestion}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {suggestions.length > 3 && (
                <div className="text-center">
                  <p className="text-xs text-gray-500">Scroll to see more suggestions</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: rgba(96, 165, 250, 0.5);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(96, 165, 250, 0.7);
        }
      `}</style>
    </div>
  )
}

export default ManifestationSearch
