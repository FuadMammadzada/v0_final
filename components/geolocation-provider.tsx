"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

interface GeolocationContextType {
  location: LocationData | null
  error: string | null
  loading: boolean
  isSupported: boolean
  hasPermission: boolean | null
  isWatching: boolean
  requestLocation: () => Promise<void>
  getCurrentLocation: () => Promise<LocationData | null>
  getLocationFromStorage: () => LocationData | null
  startWatching: () => void
  stopWatching: () => void
}

export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
  address?: string
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined)

function geolocationSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator
}

function formatGeolocationError(err: GeolocationPositionError | { code?: number }) {
  if (err.code === 1) return "Location permission denied"
  if (err.code === 2) return "Location unavailable"
  if (err.code === 3) return "Location request timed out"
  return "Error getting location"
}

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  const saveLocationToStorage = useCallback((locationData: LocationData) => {
    try {
      localStorage.setItem("manifestchain_location", JSON.stringify(locationData))
    } catch {
      // Storage can be unavailable in private mode; location should still work for the current session.
    }
  }, [])

  const getLocationFromStorage = useCallback((): LocationData | null => {
    try {
      const storedLocation = localStorage.getItem("manifestchain_location")
      return storedLocation ? (JSON.parse(storedLocation) as LocationData) : null
    } catch {
      return null
    }
  }, [])

  const attachAddress = useCallback(async (locationData: LocationData) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}&zoom=18&addressdetails=1`,
      )
      if (!response.ok) return locationData

      const data = (await response.json()) as { display_name?: string }
      return data.display_name ? { ...locationData, address: data.display_name } : locationData
    } catch {
      return locationData
    }
  }, [])

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!geolocationSupported()) {
      setError("Geolocation is not supported by your browser")
      setIsSupported(false)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 60000,
        })
      })

      const nextLocation = await attachAddress({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      })

      setHasPermission(true)
      setLocation(nextLocation)
      saveLocationToStorage(nextLocation)
      return nextLocation
    } catch (err) {
      setError(formatGeolocationError(err as GeolocationPositionError))
      setHasPermission((err as GeolocationPositionError).code === 1 ? false : hasPermission)
      return null
    } finally {
      setLoading(false)
    }
  }, [attachAddress, hasPermission, saveLocationToStorage])

  const requestLocation = useCallback(async () => {
    await getCurrentLocation()
  }, [getCurrentLocation])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && geolocationSupported()) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    setIsWatching(false)
  }, [])

  const startWatching = useCallback(() => {
    if (!geolocationSupported() || watchIdRef.current !== null) return

    setError(null)
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const nextLocation = await attachAddress({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
        setHasPermission(true)
        setLocation(nextLocation)
        saveLocationToStorage(nextLocation)
      },
      (err) => {
        setError(formatGeolocationError(err))
        setHasPermission(err.code === 1 ? false : hasPermission)
        stopWatching()
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )
    setIsWatching(true)
  }, [attachAddress, hasPermission, saveLocationToStorage, stopWatching])

  useEffect(() => {
    const supported = geolocationSupported()
    setIsSupported(supported)

    if (!supported || !("permissions" in navigator)) return

    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        setHasPermission(permission.state === "granted")
        permission.onchange = () => setHasPermission(permission.state === "granted")
      })
      .catch(() => setHasPermission(null))
  }, [])

  useEffect(() => {
    return () => stopWatching()
  }, [stopWatching])

  return (
    <GeolocationContext.Provider
      value={{
        location,
        error,
        loading,
        isSupported,
        hasPermission,
        isWatching,
        requestLocation,
        getCurrentLocation,
        getLocationFromStorage,
        startWatching,
        stopWatching,
      }}
    >
      {children}
    </GeolocationContext.Provider>
  )
}

export function useGeolocation() {
  const context = useContext(GeolocationContext)
  if (context === undefined) {
    throw new Error("useGeolocation must be used within a GeolocationProvider")
  }
  return context
}
