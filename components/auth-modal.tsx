"use client"

import type React from "react"

import { useState } from "react"
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useGeolocation } from "@/components/geolocation-provider"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "signin" | "signup"
  onModeChange: (mode: "signin" | "signup") => void
}

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [allowLocation, setAllowLocation] = useState(false)
  const [locationNotice, setLocationNotice] = useState<string | null>(null)
  const [locationNeedsTopLevel, setLocationNeedsTopLevel] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const { signUp, signIn } = useAuth()
  const { getCurrentLocation } = useGeolocation()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const validateForm = () => {
    if (mode === "signup") {
      if (!formData.name.trim()) {
        setError("Name is required")
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match")
        return false
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters")
        return false
      }
    }

    if (!formData.email.trim()) {
      setError("Email is required")
      return false
    }

    if (!formData.password.trim()) {
      setError("Password is required")
      return false
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address")
      return false
    }

    return true
  }

  const [isRequestingLocation, setIsRequestingLocation] = useState(false)

  const handleLocationCheckboxChange = async () => {
    // If already checked, uncheck
    if (allowLocation) {
      setAllowLocation(false)
      setLocationNotice(null)
      setLocationNeedsTopLevel(false)
      return
    }

    // Prevent multiple simultaneous requests
    if (isRequestingLocation) return

    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      setLocationNotice("Location requires HTTPS. Open the secure app URL, or continue without sharing your location.")
      setLocationNeedsTopLevel(false)
      return
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationNotice("Geolocation is not supported by this browser. You can continue without sharing your location.")
      setLocationNeedsTopLevel(false)
      return
    }

    const permissionsPolicy = (
      document as Document & {
        permissionsPolicy?: { allowsFeature: (feature: string) => boolean }
      }
    ).permissionsPolicy

    if (permissionsPolicy && !permissionsPolicy.allowsFeature("geolocation")) {
      setLocationNotice(
        "Location is blocked inside the v0 preview. Open the app in a new tab to allow it, or continue without location.",
      )
      setLocationNeedsTopLevel(true)
      return
    }

    setIsRequestingLocation(true)
    setError(null)
    setLocationNotice(null)
    setLocationNeedsTopLevel(false)

    try {
      const location = await getCurrentLocation()
      if (location) {
        setAllowLocation(true)
        setError(null)
        setLocationNotice(null)
      } else {
        setAllowLocation(false)
        let permissionState: PermissionState | null = null

        try {
          permissionState = (await navigator.permissions?.query({ name: "geolocation" })).state ?? null
        } catch {
          // Permissions API is not available in every browser.
        }

        const embeddedPreview = window.self !== window.top
        setLocationNeedsTopLevel(embeddedPreview)
        setLocationNotice(
          embeddedPreview
            ? "The embedded preview could not request location. Open the app in a new tab to allow it, or continue without location."
            : permissionState === "denied"
              ? "Location is blocked in your browser settings. You can enable it there or continue without location."
              : "Location was not available. You can try again or continue without sharing it.",
        )
      }
    } catch (err: any) {
      setAllowLocation(false)
      setLocationNeedsTopLevel(window.self !== window.top)
      if (err?.code === 1) {
        setLocationNotice("Location permission was denied. You can enable it in browser settings or continue without location.")
      } else if (err?.code === 3) {
        setLocationNotice("Location request timed out. You can try again or continue without location.")
      } else {
        setLocationNotice("Could not get your location. You can try again or continue without location.")
      }
    } finally {
      setIsRequestingLocation(false)
    }
  }

  // 🔥 HANDLE FORM SUBMISSION WITH YOUR WORKING FUNCTIONS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === "signup") {
        const { error } = await signUp(formData.email, formData.password, formData.name)

        if (error) {
          setError(error.message || "Failed to create account")
        } else {
          setUserEmail(formData.email)
          setShowEmailConfirmation(true)
          resetForm()
        }
      } else {
        const { error } = await signIn(formData.email, formData.password)

        if (error) {
          setError(error.message || "Failed to sign in")
        } else {
          setSuccess("Welcome back!")
          setTimeout(() => {
            onClose()
            resetForm()
          }, 1000)
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await signIn("", "", "google")

      if (error) {
        setError(error.message || "Failed to sign in with Google")
      } else {
        setSuccess("Welcome!")
        setTimeout(() => {
          onClose()
          resetForm()
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setAllowLocation(false)
    setLocationNotice(null)
    setLocationNeedsTopLevel(false)
    setError(null)
    setSuccess(null)
  }

  const handleModeChange = (newMode: "signin" | "signup") => {
    resetForm()
    setShowEmailConfirmation(false)
    setUserEmail("")
    onModeChange(newMode)
  }

  const handleClose = () => {
    resetForm()
    setShowEmailConfirmation(false)
    setUserEmail("")
    onClose()
  }

  const handleBackToSignIn = () => {
    setShowEmailConfirmation(false)
    setUserEmail("")
    handleModeChange("signin")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      {/* Darker Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-md" onClick={handleClose} />

      {/* Modal */}
      <div
        className="relative my-auto max-h-[calc(100svh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        {/* Email Confirmation Screen */}
        {showEmailConfirmation ? (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-4 text-white">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-100" />
                <h2 className="text-xl font-bold mb-2">Check Your Email</h2>
                <p className="text-green-100 text-sm">We've sent you a confirmation link</p>
              </div>
            </div>

            {/* Email Confirmation Content */}
            <div className="px-6 py-8 text-center">
              <div className="mb-6">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-white mb-3">Confirm Your Email Address</h3>
                <p className="text-gray-300 text-sm mb-2">We've sent a confirmation email to:</p>
                <p className="text-green-400 font-medium text-sm mb-4">{userEmail}</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Please check your inbox and click the confirmation link to activate your account. Once confirmed, you
                  can sign in and start your manifestation journey.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleBackToSignIn}
                  className="w-full h-9 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Continue to Sign In
                </Button>

                <p className="text-gray-500 text-xs">
                  Didn't receive the email? Check your spam folder or contact support.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="relative bg-gray-900 px-5 py-4 text-white">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">{mode === "signin" ? "Welcome Back" : "Join ManifestChain"}</h2>
                <p className="text-purple-100 text-sm">
                  {mode === "signin"
                    ? "Sign in to continue your manifestation journey"
                    : "Start your manifestation journey today"}
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="px-5 py-3 bg-gray-900">
              {/* Error/Success Messages */}
              {error && (
                <div className="mb-2 p-2 bg-red-900 bg-opacity-50 border border-red-600 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-2 p-2 bg-green-900 bg-opacity-50 border border-green-600 rounded-lg">
                  <p className="text-green-300 text-sm">{success}</p>
                </div>
              )}

              {/* Google Sign In Button */}
              <div className="mb-2">
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-9 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border border-gray-300 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>
              </div>

              {/* Divider */}
              <div className="relative mb-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">Or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                {/* Name field - only for signup */}
                {mode === "signup" && (
                  <div className="space-y-0.5">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="pl-9 h-9 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 focus:bg-gray-700"
                        disabled={loading}
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>
                )}

                {/* Email field */}
                <div className="space-y-0.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-9 h-9 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 focus:bg-gray-700"
                      disabled={loading}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-0.5">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-9 pr-10 h-9 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 focus:bg-gray-700"
                      disabled={loading}
                      required
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password field - only for signup */}
                {mode === "signup" && (
                  <div className="space-y-0.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className="pl-9 pr-10 h-9 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 focus:bg-gray-700"
                        disabled={loading}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Location Permission Checkbox - only for signup */}
                {mode === "signup" && (
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-start space-x-3 rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 text-left transition hover:bg-purple-950/35 disabled:cursor-wait disabled:opacity-60"
                      disabled={loading || isRequestingLocation}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleLocationCheckboxChange()
                      }}
                    >
                      <div className={`mt-1 w-4 h-4 min-w-[16px] rounded-sm border ${allowLocation ? 'bg-purple-600 border-purple-600' : isRequestingLocation ? 'border-purple-400 bg-transparent animate-pulse' : 'border-gray-600 bg-transparent'} flex items-center justify-center`}>
                        {allowLocation && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8.5 2.5L3.8 7.5L1.5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <span
                          className="text-sm font-medium text-gray-300 flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4 text-purple-400" />
                          {isRequestingLocation ? "Requesting Location..." : allowLocation ? "Location Allowed" : "Allow Location"}
                        </span>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Optional. Share your location for more personalized manifestations.
                        </p>
                      </div>
                    </button>
                    {locationNotice && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200">
                        <p>{locationNotice}</p>
                        {locationNeedsTopLevel && (
                          <button
                            type="button"
                            className="mt-2 font-semibold text-amber-100 underline underline-offset-2 hover:text-white"
                            onClick={() => {
                              window.open(window.location.href, "_blank", "noopener,noreferrer")
                            }}
                          >
                            Open app in a new tab
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-9 bg-transparent border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:bg-opacity-10 hover:border-purple-400 hover:text-purple-300 font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 w-4 h-4 inline animate-spin" />
                      {mode === "signin" ? "Signing in..." : "Creating Account..."}
                    </div>
                  ) : mode === "signin" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* Mode Switch */}
              <div className="text-center mt-2">
                <p className="text-sm text-gray-400">
                  {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
                  <button
                    type="button"
                    onClick={() => handleModeChange(mode === "signin" ? "signup" : "signin")}
                    className="ml-1 text-purple-400 hover:text-purple-300 font-semibold hover:underline"
                    disabled={loading}
                  >
                    {mode === "signin" ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
