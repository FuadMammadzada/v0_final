"use client"

import { AlertCircle, Eye, EyeOff, Loader2, MapPin, Navigation } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGeolocation } from "./geolocation-provider"

interface LocationDisplayProps {
  className?: string
  showControls?: boolean
  compact?: boolean
}

export default function LocationDisplay({ className = "", showControls = true, compact = false }: LocationDisplayProps) {
  const {
    location,
    error,
    loading,
    isSupported,
    hasPermission,
    getCurrentLocation,
    startWatching,
    stopWatching,
    isWatching,
  } = useGeolocation()

  if (!isSupported) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Geolocation is not supported by your browser</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact && location) {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <MapPin className="w-4 h-4 text-blue-500" />
        <span className="text-gray-600">
          {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
        </span>
        {isWatching && (
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          <span>Your Location</span>
          {isWatching && (
            <Badge variant="secondary" className="ml-2">
              Live Tracking
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {hasPermission ? "Location services are available" : "Location permission may be required"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Location Error</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-sm text-blue-700">Getting your location...</span>
          </div>
        )}

        {location && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="space-y-2">
                {location.address && (
                  <div>
                    <p className="text-sm font-medium text-green-800">Address</p>
                    <p className="text-sm text-green-700">{location.address}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-green-600">
                  <div>
                    <span className="font-medium">Latitude:</span>
                    <br />
                    {location.latitude.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-medium">Longitude:</span>
                    <br />
                    {location.longitude.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-medium">Accuracy:</span>
                    <br />
                    +/-{Math.round(location.accuracy ?? 0)}m
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>
                    <br />
                    {new Date(location.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showControls && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={getCurrentLocation} disabled={loading} size="sm" variant="outline">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
              Get Location
            </Button>

            <Button
              onClick={isWatching ? stopWatching : startWatching}
              disabled={loading}
              size="sm"
              variant={isWatching ? "destructive" : "default"}
            >
              {isWatching ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Start Tracking
                </>
              )}
            </Button>
          </div>
        )}

        {location && (
          <div className="pt-2 border-t">
            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              View on Google Maps -&gt;
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
