"use client"

import { useEffect, useState } from "react"
import { getAccessToken } from "@/lib/supabase"

export default function AdminGate() {
  const [status, setStatus] = useState<"checking" | "denied" | "error">("checking")

  useEffect(() => {
    let active = true

    async function verifyAdminAccess() {
      let token: string
      try {
        token = await getAccessToken()
      } catch {
        if (active) setStatus("denied")
        window.location.replace("/")
        return
      }

      const response = await fetch("/api/admin/readiness", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      })

      if (!response.ok) {
        if (active) setStatus(response.status === 401 || response.status === 403 ? "denied" : "error")
        if (response.status === 401 || response.status === 403) {
          window.location.replace("/")
        }
        return
      }

      const sessionResponse = await fetch("/api/admin/session", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      })

      if (!sessionResponse.ok) {
        if (active) setStatus("error")
        return
      }

      window.location.replace("/admin")
    }

    verifyAdminAccess().catch(() => {
      if (active) setStatus("error")
    })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Admin access</p>
        <h1 className="text-2xl font-semibold">
          {status === "checking" ? "Checking access" : status === "denied" ? "Access required" : "Unable to verify"}
        </h1>
        <p className="text-sm leading-6 text-slate-400">
          {status === "checking"
            ? "Verifying your session before loading the console."
            : status === "denied"
              ? "Sign in with an authorized admin account to continue."
              : "The admin console could not be verified. Try again after checking configuration."}
        </p>
      </div>
    </main>
  )
}
