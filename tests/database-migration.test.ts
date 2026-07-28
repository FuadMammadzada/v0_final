import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0001_initial_schema.sql"), "utf8")
const upgradeMigration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/0002_upgrade_existing_schema.sql"),
  "utf8",
)

describe("initial Supabase migration", () => {
  it("defines idempotent Stripe webhook and payment storage", () => {
    expect(migration).toContain("create table if not exists public.webhook_events")
    expect(migration).toContain("id text primary key")
    expect(migration).toContain("webhook_events_status_allowed")
    expect(migration).toContain("status in ('pending', 'processed', 'failed')")
    expect(migration).toContain("payments_checkout_session_unique unique")
    expect(migration).toContain("stripe_price_id text")
    expect(migration).toContain("entitlement_consumed_at timestamptz")
    expect(migration).toContain("create or replace function public.fulfill_paid_payment")
    expect(migration).toContain("p_stripe_price_id text")
    expect(migration).toContain("if v_payment.fulfilled_at is not null then")
    expect(migration).toContain("return false;")
    expect(migration).toContain("if p_action = 'one_more_try' then")
  })

  it("prevents negative quota values and stores manifestations transactionally", () => {
    expect(migration).toContain("user_profiles_manifestation_count_non_negative")
    expect(migration).toContain("user_profiles_bonus_searches_non_negative")
    expect(migration).toContain("manifestations_query_length")
    expect(migration).toContain("create or replace function public.record_manifestation")
    expect(migration).toContain("create or replace function public.reserve_manifestation_attempt")
    expect(migration).toContain("create or replace function public.finalize_manifestation_attempt")
    expect(migration).toContain("create or replace function public.release_manifestation_attempt")
    expect(migration).toContain("reservation_expires_at")
    expect(migration).toContain("for update")
  })

  it("adds async Make jobs and operational audit tables", () => {
    expect(migration).toContain("create table if not exists public.manifestation_jobs")
    expect(migration).toContain("manifestation_jobs_status_allowed")
    expect(migration).toContain("create index if not exists manifestation_jobs_status_next_attempt_idx")
    expect(migration).toContain("create table if not exists public.admin_actions")
    expect(migration).toContain("create table if not exists public.system_audit_logs")
    expect(migration).toContain("create table if not exists public.data_retention_policies")
    expect(migration).toContain("create table if not exists public.backup_runs")
  })

  it("uses RLS and safe SECURITY DEFINER search paths", () => {
    expect(migration).toContain("alter table public.user_profiles enable row level security")
    expect(migration).toContain("alter table public.payments enable row level security")
    expect(migration).toContain("security definer")
    expect(migration).toContain("set search_path = public, auth")
    expect(migration).toContain("grant execute on function public.reserve_manifestation_attempt(uuid, text, text) to service_role")
    expect(migration).toContain("revoke all on function public.record_manifestation(text, text) from authenticated")
  })
})

describe("existing Supabase upgrade migration", () => {
  it("documents fresh-install and upgrade migration responsibilities", () => {
    expect(migration).toContain("Fresh-install migration")
    expect(upgradeMigration).toContain("Upgrade migration for existing Supabase projects")
    expect(upgradeMigration).toContain("Fresh installs should run 0001 then 0002")
  })

  it("adds required columns to existing tables with additive ALTER statements", () => {
    for (const column of [
      "status text",
      "mode text",
      "payment_id uuid",
      "used_monthly boolean",
      "used_bonus boolean",
      "reservation_expires_at timestamptz",
      "completed_at timestamptz",
      "failed_at timestamptz",
    ]) {
      expect(upgradeMigration).toContain(`alter table public.manifestations add column if not exists ${column}`)
    }

    for (const column of [
      "stripe_price_id text",
      "entitlement_consumed_at timestamptz",
      "entitlement_expires_at timestamptz",
    ]) {
      expect(upgradeMigration).toContain(`alter table public.payments add column if not exists ${column}`)
    }

    for (const column of ["status text", "error text", "processed_at timestamptz"]) {
      expect(upgradeMigration).toContain(`alter table public.webhook_events add column if not exists ${column}`)
    }
  })

  it("creates production-readiness tables, indexes, and safe policies idempotently", () => {
    for (const table of [
      "manifestation_jobs",
      "admin_actions",
      "system_audit_logs",
      "data_retention_policies",
      "backup_runs",
    ]) {
      expect(upgradeMigration).toContain(`create table if not exists public.${table}`)
      expect(upgradeMigration).toContain(`alter table public.${table} enable row level security`)
    }

    expect(upgradeMigration).toContain("drop policy if exists")
    expect(upgradeMigration).toContain("create policy \"Users can view own manifestation jobs\"")
    expect(upgradeMigration).toContain("create index if not exists manifestation_jobs_timeout_idx")
    expect(upgradeMigration).toContain("create index if not exists admin_actions_admin_created_idx")
    expect(upgradeMigration).toContain("create index if not exists system_audit_logs_created_idx")
    expect(upgradeMigration).toContain("create index if not exists backup_runs_created_idx")
  })

  it("replaces RPC functions with safe SECURITY DEFINER search paths and revokes legacy access", () => {
    for (const fn of [
      "reserve_manifestation_attempt",
      "finalize_manifestation_attempt",
      "release_manifestation_attempt",
      "fulfill_paid_payment",
    ]) {
      expect(upgradeMigration).toContain(`create or replace function public.${fn}`)
    }

    expect(upgradeMigration.match(/security definer/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
    expect(upgradeMigration.match(/set search_path = public, auth/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
    expect(upgradeMigration).toContain("to_regprocedure('public.record_manifestation(text, text)')")
    expect(upgradeMigration).toContain(
      "revoke all on function public.record_manifestation(text, text) from public, anon, authenticated",
    )
  })
})
