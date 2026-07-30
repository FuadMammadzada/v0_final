import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const authStorageKey = (() => {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
    return projectRef ? `sb-${projectRef}-auth-token` : null
  } catch {
    return null
  }
})()

// Check if Supabase is properly configured
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Create Supabase client only if properly configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    })
  : null

let invalidSessionCleanup: Promise<void> | null = null

function isInvalidRefreshTokenError(error: unknown) {
  const authError = error as { code?: string; message?: string } | null
  const message = authError?.message?.toLowerCase() ?? ""

  return (
    authError?.code === "refresh_token_not_found" ||
    authError?.code === "refresh_token_already_used" ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  )
}

async function clearInvalidAuthSession() {
  if (!supabase) return

  if (!invalidSessionCleanup) {
    invalidSessionCleanup = (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" })
      } catch {
        // Explicit storage cleanup below handles clients with an already-invalid session.
      }

      if (typeof window !== "undefined" && authStorageKey) {
        try {
          for (const key of Object.keys(window.localStorage)) {
            if (key === authStorageKey || key.startsWith(`${authStorageKey}.`)) {
              window.localStorage.removeItem(key)
            }
          }
        } catch {
          // Storage can be unavailable in privacy mode; local sign-out is still attempted.
        }
      }
    })().finally(() => {
      invalidSessionCleanup = null
    })
  }

  await invalidSessionCleanup
}

async function recoverInvalidSession(error: unknown) {
  if (isInvalidRefreshTokenError(error)) {
    await clearInvalidAuthSession()
  }
}

export async function signUp(email: string, password: string) {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return { data: null, error: new Error("Supabase not configured") }
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) {
      return { data: null, error }
    } else {
      return { data, error: null }
    }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function signIn(email: string, password: string) {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return { data: null, error: new Error("Supabase not configured") }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      return { data: null, error }
    } else {
      return { data, error: null }
    }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getCurrentUser() {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return null
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      await recoverInvalidSession(error)
      return null
    }

    return user ?? null
  } catch (error) {
    await recoverInvalidSession(error)
    return null
  }
}

export async function getAccessToken() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Authentication is unavailable")
  }

  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      await recoverInvalidSession(error)
      throw error
    }

    if (!data.session?.access_token) {
      throw new Error("Please sign in again")
    }

    return data.session.access_token
  } catch (error) {
    await recoverInvalidSession(error)
    throw error
  }
}

export async function signOut() {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return { error: null }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      await recoverInvalidSession(error)
      return { error }
    }

    return { error: null }
  } catch (err) {
    await recoverInvalidSession(err)
    return { error: err }
  }
}

export type User = {
  id: string
  email: string
  created_at: string
  last_manifestation?: string
  manifestation_count?: number
}

export type Manifestation = {
  id: string
  user_id: string
  query: string
  response: string
  created_at: string
}

export { isSupabaseConfigured }
