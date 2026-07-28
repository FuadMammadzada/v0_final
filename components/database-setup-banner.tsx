"use client"

import { useState } from "react"
import { AlertTriangle, Database, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export default function DatabaseSetupBanner() {
  const { databaseReady, initializeDatabase } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [checking, setChecking] = useState(false)

  if (databaseReady || dismissed) {
    return null
  }

  const handleCheckDatabase = async () => {
    setChecking(true)
    const success = await initializeDatabase()
    setChecking(false)

    if (success) {
      setDismissed(true)
    }
  }

  const handleSetupInstructions = () => {
    const setupSteps = `DATABASE SETUP INSTRUCTIONS

Run this migration in your Supabase SQL Editor:

supabase/migrations/0001_initial_schema.sql

This creates:
- user_profiles with non-negative quota constraints
- manifestations with query length checks
- payments and webhook_events for Stripe fulfillment
- RLS policies, indexes, triggers, and safe RPC functions
- transactional quota recording and idempotent payment fulfillment

Steps:
1. Go to your Supabase project dashboard
2. Click SQL Editor
3. Copy and run supabase/migrations/0001_initial_schema.sql
4. Come back and click "Check Again"`

    alert(setupSteps)
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-500 bg-amber-300 p-3 text-slate-950 shadow-lg">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-900 sm:mt-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-950">Database tables need to be set up for full functionality</p>
            <p className="mt-0.5 break-words text-xs leading-5 text-slate-800">
              Run supabase/migrations/0001_initial_schema.sql to enable profiles, payments, and manifestation tracking
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-8 sm:flex-nowrap sm:pl-0">
          <Button
            onClick={handleSetupInstructions}
            size="sm"
            variant="secondary"
            className="border border-slate-800 bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
          >
            Setup Instructions
          </Button>

          <Button
            onClick={handleCheckDatabase}
            disabled={checking}
            size="sm"
            variant="secondary"
            className="border border-slate-700 bg-white text-slate-950 hover:bg-slate-100 hover:text-slate-950"
          >
            {checking ? (
              <>
                <Database className="w-4 h-4 mr-1 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-1" />
                Check Again
              </>
            )}
          </Button>

          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1.5 text-slate-900 hover:bg-amber-400"
            aria-label="Dismiss database setup notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
