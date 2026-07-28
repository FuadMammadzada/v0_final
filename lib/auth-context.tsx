"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  supabase,
  signUp as supabaseSignUp,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  getCurrentUser,
  isSupabaseConfigured,
} from "./supabase"

type AuthResult = Promise<{ error: Error | null; data?: unknown }>

type AuthContextType = {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => AuthResult
  signIn: (email: string, password: string, provider?: string) => AuthResult
  signOut: () => Promise<void>
  canManifest: boolean
  manifestationCount: number
  lastManifestation: string | null
  bonusSearches: number
  checkManifestationLimit: () => Promise<boolean>
  refreshUserProfile: () => Promise<void>
  databaseReady: boolean
  initializeDatabase: () => Promise<boolean>
  supabaseConfigured: boolean
  userName: string | null
}

type UserProfile = {
  id: string
  email: string | null
  name: string | null
  last_manifestation: string | null
  manifestation_count: number | null
  bonus_searches: number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

function getStoredPendingName() {
  return typeof window !== "undefined" ? localStorage.getItem("pendingSignupName") : null
}

function clearStoredPendingName() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pendingSignupName")
  }
}

function toAuthError(error: unknown, fallback = "Authentication failed") {
  return error instanceof Error ? error : new Error(fallback)
}

function canManifestFromProfile(profile: Pick<UserProfile, "last_manifestation" | "bonus_searches">) {
  const lastManifestationDate = profile.last_manifestation ? new Date(profile.last_manifestation) : null
  const monthlyLimitExpired =
    !lastManifestationDate || Date.now() - lastManifestationDate.getTime() > MONTH_MS

  return monthlyLimitExpired || Math.max(profile.bonus_searches ?? 0, 0) > 0
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [canManifest, setCanManifest] = useState(false)
  const [manifestationCount, setManifestationCount] = useState(0)
  const [lastManifestation, setLastManifestation] = useState<string | null>(null)
  const [bonusSearches, setBonusSearches] = useState(0)
  const [databaseReady, setDatabaseReady] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [pendingSignupName, setPendingSignupName] = useState<string | null>(null)

  const resetProfileState = useCallback((allow = false) => {
    setCanManifest(allow)
    setManifestationCount(0)
    setLastManifestation(null)
    setBonusSearches(0)
    setUserName(null)
  }, [])

  const applyProfile = useCallback((profile: UserProfile) => {
    const safeBonusSearches = Math.max(profile.bonus_searches ?? 0, 0)
    setCanManifest(canManifestFromProfile(profile))
    setManifestationCount(Math.max(profile.manifestation_count ?? 0, 0))
    setLastManifestation(profile.last_manifestation)
    setBonusSearches(safeBonusSearches)
    setUserName(profile.name || profile.email?.split("@")[0] || "User")
  }, [])

  const checkDatabaseTables = useCallback(async (): Promise<boolean> => {
    if (!supabase || !isSupabaseConfigured) {
      setDatabaseReady(false)
      return false
    }

    const { error } = await supabase
      .from("user_profiles")
      .select("id, name, bonus_searches, last_manifestation, manifestation_count")
      .limit(1)

    const ready = !error
    setDatabaseReady(ready)
    return ready
  }, [])

  const initializeDatabase = useCallback(async (): Promise<boolean> => {
    return checkDatabaseTables()
  }, [checkDatabaseTables])

  const checkUserProfile = useCallback(
    async (profileUser: User): Promise<boolean> => {
      if (!supabase || !isSupabaseConfigured) {
        resetProfileState(false)
        return false
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, name, last_manifestation, manifestation_count, bonus_searches")
        .eq("id", profileUser.id)
        .maybeSingle()

      if (error) {
        resetProfileState(false)
        return false
      }

      if (data) {
        applyProfile(data as UserProfile)
        return true
      }

      const profileName = getStoredPendingName() || pendingSignupName || profileUser.email?.split("@")[0] || "User"
      const { data: createdProfile, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          id: profileUser.id,
          email: profileUser.email,
          manifestation_count: 0,
          bonus_searches: 0,
          name: profileName,
        })
        .select("id, email, name, last_manifestation, manifestation_count, bonus_searches")
        .single()

      if (insertError || !createdProfile) {
        resetProfileState(false)
        return false
      }

      clearStoredPendingName()
      setPendingSignupName(null)
      applyProfile(createdProfile as UserProfile)
      return true
    },
    [applyProfile, pendingSignupName, resetProfileState],
  )

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await checkUserProfile(user)
    }
  }, [checkUserProfile, user])

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        if (!supabase || !isSupabaseConfigured) {
          resetProfileState(false)
          return
        }

        const currentUser = await getCurrentUser()
        setUser(currentUser)

        const dbReady = await checkDatabaseTables()
        if (currentUser && dbReady) {
          await checkUserProfile(currentUser)
        } else {
          resetProfileState(false)
        }
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    if (!supabase || !isSupabaseConfigured) {
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        const dbReady = await checkDatabaseTables()
        if (dbReady) {
          await checkUserProfile(session.user)
        } else {
          resetProfileState(false)
        }
      } else {
        resetProfileState(false)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [checkDatabaseTables, checkUserProfile, resetProfileState])

  const signUp = async (email: string, password: string, name: string): AuthResult => {
    try {
      const nameToStore = name || email.split("@")[0]
      setPendingSignupName(nameToStore)
      if (typeof window !== "undefined") {
        localStorage.setItem("pendingSignupName", nameToStore)
      }

      const result = await supabaseSignUp(email, password)
      if (result.error) {
        clearStoredPendingName()
        setPendingSignupName(null)
        return { error: toAuthError(result.error) }
      }

      return { data: result.data, error: null }
    } catch (err) {
      clearStoredPendingName()
      setPendingSignupName(null)
      return { error: toAuthError(err) }
    }
  }

  const signIn = async (email: string, password: string, provider?: string): AuthResult => {
    try {
      if (provider === "google") {
        if (!supabase || !isSupabaseConfigured) {
          return { error: new Error("Supabase not configured") }
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        return { data, error: error ? toAuthError(error) : null }
      }

      const result = await supabaseSignIn(email, password)
      return result.error ? { error: toAuthError(result.error) } : { data: result.data, error: null }
    } catch (err) {
      return { error: toAuthError(err) }
    }
  }

  const signOut = async () => {
    setLoading(true)
    setUser(null)
    resetProfileState(false)

    try {
      await supabaseSignOut()
    } finally {
      setLoading(false)
    }
  }

  const checkManifestationLimit = async (): Promise<boolean> => {
    if (!user || !supabase || !isSupabaseConfigured || !databaseReady) {
      setCanManifest(false)
      return false
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("last_manifestation, bonus_searches")
      .eq("id", user.id)
      .single()

    if (error || !data) {
      setCanManifest(false)
      return false
    }

    const canUse = canManifestFromProfile(data)
    setCanManifest(canUse)
    setBonusSearches(Math.max(data.bonus_searches ?? 0, 0))
    return canUse
  }

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    canManifest,
    manifestationCount,
    lastManifestation,
    bonusSearches,
    checkManifestationLimit,
    refreshUserProfile,
    databaseReady,
    initializeDatabase,
    supabaseConfigured: Boolean(isSupabaseConfigured),
    userName,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
