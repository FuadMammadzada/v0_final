import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

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
    } = await supabase.auth.getUser()

    return user ?? null
  } catch (error) {
    return null
  }
}

export async function signOut() {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return { error: null }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error }
    }

    return { error: null }
  } catch (err) {
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
