"use client"

import { useEffect, useState } from "react"

const storageKey = "manifestchain_cookie_consent"

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!localStorage.getItem(storageKey))
  }, [])

  const choose = (value: "essential" | "all") => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        value,
        analytics: value === "all",
        updatedAt: new Date().toISOString(),
      }),
    )
    window.dispatchEvent(new CustomEvent("manifestchain-consent", { detail: { analytics: value === "all" } }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[1000] mx-auto max-w-3xl rounded border border-white/15 bg-slate-950 p-4 text-white shadow-2xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">Cookie and analytics consent</p>
          <p className="mt-1 text-xs text-slate-300">
            Essential storage keeps the app working. Analytics is optional and helps us improve reliability.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => choose("essential")} className="rounded border border-white/20 px-3 py-2 text-xs">
            Essential only
          </button>
          <button onClick={() => choose("all")} className="rounded bg-cyan-400 px-3 py-2 text-xs font-medium text-slate-950">
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  )
}
