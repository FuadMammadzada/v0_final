// Geolocation utility functions
export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  address?: string
  city?: string
  country?: string
}

export interface GeolocationError {
  code: number
  message: string
}

// Get user's current location using browser's geolocation API
export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: "Geolocation is not supported by this browser",
      })
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes cache
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }
        resolve(locationData)
      },
      (error) => {
        const geolocationError: GeolocationError = {
          code: error.code,
          message: getErrorMessage(error.code),
        }
        reject(geolocationError)
      },
      options,
    )
  })
}

// Watch user's location changes
export const watchLocation = (
  onSuccess: (location: LocationData) => void,
  onError: (error: GeolocationError) => void,
): number => {
  if (!navigator.geolocation) {
    onError({
      code: 0,
      message: "Geolocation is not supported by this browser",
    })
    return -1
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000, // 1 minute cache
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      }
      onSuccess(locationData)
    },
    (error) => {
      const geolocationError: GeolocationError = {
        code: error.code,
        message: getErrorMessage(error.code),
      }
      onError(geolocationError)
    },
    options,
  )
}

// Stop watching location
export const clearLocationWatch = (watchId: number) => {
  if (navigator.geolocation && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId)
  }
}

// Get human-readable error message
const getErrorMessage = (code: number): string => {
  switch (code) {
    case 1:
      return "Location access denied by user"
    case 2:
      return "Location information is unavailable"
    case 3:
      return "Location request timed out"
    default:
      return "An unknown error occurred"
  }
}

// Reverse geocoding - convert coordinates to address
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    // Using a free geocoding service (you can replace with your preferred service)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    )

    if (!response.ok) {
      throw new Error("Geocoding request failed")
    }

    const data = await response.json()

    // Format the address
    const parts = []
    if (data.locality) parts.push(data.locality)
    if (data.principalSubdivision) parts.push(data.principalSubdivision)
    if (data.countryName) parts.push(data.countryName)

    return parts.join(", ") || "Unknown location"
  } catch {
    return "Address unavailable"
  }
}

// Calculate distance between two points (in kilometers)
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

// Check if geolocation is supported
export const isGeolocationSupported = (): boolean => {
  return "geolocation" in navigator
}

// Request permission for geolocation
export const requestLocationPermission = async (): Promise<boolean> => {
  if (!("permissions" in navigator)) {
    return true // Assume permission if Permissions API is not supported
  }

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" })
    return permission.state === "granted" || permission.state === "prompt"
  } catch {
    return true // Assume permission if check fails
  }
}
