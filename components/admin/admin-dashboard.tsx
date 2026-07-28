"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, CreditCard, RefreshCcw, Search, Shield, Users, Webhook } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Tab = "readiness" | "payments" | "webhooks" | "users"

type LoadState<T> = {
  data: T
  error: string | null
  loading: boolean
}

const tabs: Array<{ id: Tab; label: string; icon: typeof Shield }> = [
  { id: "readiness", label: "Readiness", icon: Shield },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "users", label: "Users", icon: Users },
]

async function getAccessToken() {
  if (!supabase) throw new Error("Supabase is not configured")
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error("Admin sign-in required")
  return data.session.access_token
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? "Admin request failed")
  return body as T
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "processed" || status === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800"

  return <span className={`rounded px-2 py-1 text-xs font-medium ${tone}`}>{status}</span>
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("readiness")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [readiness, setReadiness] = useState<LoadState<any[]>>({ data: [], error: null, loading: false })
  const [payments, setPayments] = useState<LoadState<any[]>>({ data: [], error: null, loading: false })
  const [webhooks, setWebhooks] = useState<LoadState<any[]>>({ data: [], error: null, loading: false })
  const [users, setUsers] = useState<LoadState<any[]>>({ data: [], error: null, loading: false })

  const readinessScore = useMemo(() => {
    if (readiness.data.length === 0) return 0
    return Math.round((readiness.data.filter((item) => item.ok).length / readiness.data.length) * 100)
  }, [readiness.data])

  const loadReadiness = async () => {
    setReadiness((state) => ({ ...state, loading: true, error: null }))
    try {
      const body = await adminFetch<{ checklist: any[] }>("/api/admin/readiness")
      setReadiness({ data: body.checklist, error: null, loading: false })
    } catch (error) {
      setReadiness({ data: [], error: error instanceof Error ? error.message : "Unable to load readiness", loading: false })
    }
  }

  const loadPayments = async () => {
    setPayments((state) => ({ ...state, loading: true, error: null }))
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (status) params.set("status", status)
      const body = await adminFetch<{ payments: any[] }>(`/api/admin/payments?${params}`)
      setPayments({ data: body.payments, error: null, loading: false })
    } catch (error) {
      setPayments({ data: [], error: error instanceof Error ? error.message : "Unable to load payments", loading: false })
    }
  }

  const loadWebhooks = async () => {
    setWebhooks((state) => ({ ...state, loading: true, error: null }))
    try {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      const body = await adminFetch<{ webhooks: any[] }>(`/api/admin/webhooks?${params}`)
      setWebhooks({ data: body.webhooks, error: null, loading: false })
    } catch (error) {
      setWebhooks({ data: [], error: error instanceof Error ? error.message : "Unable to load webhooks", loading: false })
    }
  }

  const loadUsers = async () => {
    setUsers((state) => ({ ...state, loading: true, error: null }))
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const body = await adminFetch<{ users: any[] }>(`/api/admin/users?${params}`)
      setUsers({ data: body.users, error: null, loading: false })
    } catch (error) {
      setUsers({ data: [], error: error instanceof Error ? error.message : "Unable to load users", loading: false })
    }
  }

  const refresh = async () => {
    if (activeTab === "readiness") await loadReadiness()
    if (activeTab === "payments") await loadPayments()
    if (activeTab === "webhooks") await loadWebhooks()
    if (activeTab === "users") await loadUsers()
  }

  useEffect(() => {
    refresh()
  }, [activeTab])

  const replayWebhook = async (eventId: string) => {
    await adminFetch("/api/admin/webhooks/replay", {
      method: "POST",
      body: JSON.stringify({ eventId }),
    })
    await loadWebhooks()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-slate-400">ManifestChain Admin</p>
            <h1 className="text-3xl font-semibold text-white">Production Operations</h1>
          </div>
          <button
            onClick={refresh}
            className="inline-flex w-fit items-center gap-2 rounded border border-white/15 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                  activeTab === tab.id
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {(activeTab === "payments" || activeTab === "users" || activeTab === "webhooks") && (
          <section className="flex flex-col gap-3 rounded border border-white/10 bg-white/[0.03] p-4 md:flex-row">
            {(activeTab === "payments" || activeTab === "users") && (
              <label className="flex flex-1 items-center gap-2 rounded border border-white/10 bg-slate-900 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by email, name, or user id"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </label>
            )}
            {(activeTab === "payments" || activeTab === "webhooks") && (
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="processed">Processed</option>
                <option value="pending">Pending</option>
              </select>
            )}
            <button onClick={refresh} className="rounded bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950">
              Apply
            </button>
          </section>
        )}

        {activeTab === "readiness" && (
          <section className="space-y-3">
            <div className="rounded border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Readiness score</p>
              <p className="text-3xl font-semibold text-white">{readinessScore}%</p>
            </div>
            {readiness.error && <p className="text-sm text-red-300">{readiness.error}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {readiness.data.map((item) => (
                <div key={item.name} className="rounded border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    {item.ok ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="mt-1 h-5 w-5 text-amber-400" />
                    )}
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "payments" && (
          <section className="overflow-x-auto rounded border border-white/10">
            {payments.error && <p className="p-4 text-sm text-red-300">{payments.error}</p>}
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-white/[0.06] text-slate-300">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Fulfilled</th>
                  <th className="px-4 py-3">Consumed</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.map((payment) => (
                  <tr key={payment.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{payment.user_profiles?.email ?? payment.user_id}</td>
                    <td className="px-4 py-3">{payment.action}</td>
                    <td className="px-4 py-3"><StatusPill status={payment.status} /></td>
                    <td className="px-4 py-3">{money(payment.amount_total, payment.currency)}</td>
                    <td className="px-4 py-3">{payment.fulfilled_at ? new Date(payment.fulfilled_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">{payment.entitlement_consumed_at ? new Date(payment.entitlement_consumed_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">{new Date(payment.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === "webhooks" && (
          <section className="overflow-x-auto rounded border border-white/10">
            {webhooks.error && <p className="p-4 text-sm text-red-300">{webhooks.error}</p>}
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-white/[0.06] text-slate-300">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Error</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.data.map((event) => (
                  <tr key={event.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-mono text-xs">{event.id}</td>
                    <td className="px-4 py-3">{event.type}</td>
                    <td className="px-4 py-3"><StatusPill status={event.status} /></td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-400">{event.error ?? "-"}</td>
                    <td className="px-4 py-3">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        disabled={event.status === "processed"}
                        onClick={() => replayWebhook(event.id)}
                        className="rounded border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
                      >
                        Replay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === "users" && (
          <section className="grid gap-3">
            {users.error && <p className="text-sm text-red-300">{users.error}</p>}
            {users.data.map((user) => (
              <div key={user.id} className="rounded border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-white">{user.email ?? user.id}</p>
                    <p className="text-sm text-slate-400">{user.name ?? "Unnamed user"}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{user.id}</p>
                  </div>
                  <div className="grid gap-2 text-sm md:grid-cols-3">
                    <span>Quota: {user.bonus_searches} bonus</span>
                    <span>Manifestations: {user.manifestation_count}</span>
                    <span>Payments: {user.payments?.length ?? 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
