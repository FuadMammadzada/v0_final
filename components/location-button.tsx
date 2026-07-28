"use client"
import { MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeolocation } from "./geolocation-provider"

interface LocationButtonProps {
  onLocationUpdate?: (location: any) => void
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost"
  showText?: boolean
}

export default function LocationButton({
  onLocationUpdate,
  className = "",
  size = "default",
  variant = "outline",
  showText = true,
}: LocationButtonProps) {
  const { getCurrentLocation, loading } = useGeolocation()

  const handleClick = async () => {
    const nextLocation = await getCurrentLocation()
    if (nextLocation && onLocationUpdate) {
      onLocationUpdate(nextLocation)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} size={size} variant={variant} className={className}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
      {showText && <span className="ml-2">{loading ? "Getting Location..." : "Get Location"}</span>}
    </Button>
  )
}
