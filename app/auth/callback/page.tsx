"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!supabase) {
          router.replace("/?error=auth_error")
          return
        }

        const { data, error } = await supabase.auth.getSession()

        if (error) {
          router.replace("/?error=auth_error")
          return
        }

        if (data.session) {
          router.replace("/?success=signed_in")
        } else {
          router.replace("/")
        }
      } catch {
        router.replace("/?error=auth_error")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  )
}
