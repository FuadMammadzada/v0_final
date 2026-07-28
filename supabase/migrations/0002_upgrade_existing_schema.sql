-- Upgrade migration for existing Supabase projects that already ran an older
-- 0001_initial_schema.sql. This file is intentionally additive and safe to run
-- after the current fresh-install 0001 as well.
--
-- Fresh installs should run 0001 then 0002 in normal migration order. Existing
-- installs should apply this migration to add missing production-readiness
-- columns, async job tables, indexes, RLS policies, and RPC definitions.

create extension if not exists pgcrypto;

alter table public.manifestations add column if not exists status text;
alter table public.manifestations add column if not exists mode text;
alter table public.manifestations add column if not exists payment_id uuid;
alter table public.manifestations add column if not exists used_monthly boolean;
alter table public.manifestations add column if not exists used_bonus boolean;
alter table public.manifestations add column if not exists reservation_expires_at timestamptz;
alter table public.manifestations add column if not exists completed_at timestamptz;
alter table public.manifestations add column if not exists failed_at timestamptz;

update public.manifestations
set status = coalesce(status, 'completed'),
    mode = coalesce(mode, 'default'),
    used_monthly = coalesce(used_monthly, false),
    used_bonus = coalesce(used_bonus, false),
    completed_at = case
      when status = 'completed' then coalesce(completed_at, created_at)
      else completed_at
    end;

alter table public.manifestations alter column status set default 'completed';
alter table public.manifestations alter column status set not null;
alter table public.manifestations alter column mode set default 'default';
alter table public.manifestations alter column mode set not null;
alter table public.manifestations alter column used_monthly set default false;
alter table public.manifestations alter column used_monthly set not null;
alter table public.manifestations alter column used_bonus set default false;
alter table public.manifestations alter column used_bonus set not null;

alter table public.payments add column if not exists stripe_price_id text;
alter table public.payments add column if not exists entitlement_consumed_at timestamptz;
alter table public.payments add column if not exists entitlement_expires_at timestamptz;

alter table public.webhook_events add column if not exists status text;
alter table public.webhook_events add column if not exists error text;
alter table public.webhook_events add column if not exists processed_at timestamptz;
alter table public.webhook_events add column if not exists updated_at timestamptz not null default now();
update public.webhook_events
set status = coalesce(status, case when processed_at is not null then 'processed' else 'pending' end);
alter table public.webhook_events alter column status set default 'pending';
alter table public.webhook_events alter column status set not null;
alter table public.webhook_events alter column processed_at drop default;
alter table public.webhook_events alter column processed_at drop not null;

create table if not exists public.manifestation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  manifestation_id uuid not null references public.manifestations(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  mode text not null,
  query text not null,
  lat double precision not null,
  lon double precision not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz,
  timeout_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.system_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  severity text not null default 'info',
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.data_retention_policies (
  id text primary key,
  description text not null,
  retention_days integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'supabase',
  status text not null default 'scheduled',
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestations_payment_id_fkey'
      and conrelid = 'public.manifestations'::regclass
  ) then
    alter table public.manifestations
      add constraint manifestations_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestations_status_allowed'
      and conrelid = 'public.manifestations'::regclass
  ) then
    alter table public.manifestations
      add constraint manifestations_status_allowed check (status in ('reserved', 'completed', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestations_mode_allowed'
      and conrelid = 'public.manifestations'::regclass
  ) then
    alter table public.manifestations
      add constraint manifestations_mode_allowed check (mode in ('default', 'complete_108'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestations_quota_source'
      and conrelid = 'public.manifestations'::regclass
  ) then
    alter table public.manifestations
      add constraint manifestations_quota_source check (not (used_monthly and used_bonus));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'webhook_events_status_allowed'
      and conrelid = 'public.webhook_events'::regclass
  ) then
    alter table public.webhook_events
      add constraint webhook_events_status_allowed check (status in ('pending', 'processed', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestation_jobs_manifestation_unique'
      and conrelid = 'public.manifestation_jobs'::regclass
  ) then
    alter table public.manifestation_jobs
      add constraint manifestation_jobs_manifestation_unique unique (manifestation_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestation_jobs_mode_allowed'
      and conrelid = 'public.manifestation_jobs'::regclass
  ) then
    alter table public.manifestation_jobs
      add constraint manifestation_jobs_mode_allowed check (mode in ('default', 'complete_108'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestation_jobs_status_allowed'
      and conrelid = 'public.manifestation_jobs'::regclass
  ) then
    alter table public.manifestation_jobs
      add constraint manifestation_jobs_status_allowed check (status in ('queued', 'processing', 'completed', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestation_jobs_attempts_valid'
      and conrelid = 'public.manifestation_jobs'::regclass
  ) then
    alter table public.manifestation_jobs
      add constraint manifestation_jobs_attempts_valid check (attempts >= 0 and max_attempts between 1 and 10);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestation_jobs_coordinates_valid'
      and conrelid = 'public.manifestation_jobs'::regclass
  ) then
    alter table public.manifestation_jobs
      add constraint manifestation_jobs_coordinates_valid check (lat between -90 and 90 and lon between -180 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manifestation_jobs_query_length'
      and conrelid = 'public.manifestation_jobs'::regclass
  ) then
    alter table public.manifestation_jobs
      add constraint manifestation_jobs_query_length check (char_length(query) between 1 and 500);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_actions_action_length'
      and conrelid = 'public.admin_actions'::regclass
  ) then
    alter table public.admin_actions
      add constraint admin_actions_action_length check (char_length(action) between 3 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'system_audit_logs_severity_allowed'
      and conrelid = 'public.system_audit_logs'::regclass
  ) then
    alter table public.system_audit_logs
      add constraint system_audit_logs_severity_allowed check (severity in ('info', 'warn', 'error'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'data_retention_policies_retention_positive'
      and conrelid = 'public.data_retention_policies'::regclass
  ) then
    alter table public.data_retention_policies
      add constraint data_retention_policies_retention_positive check (retention_days > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'backup_runs_status_allowed'
      and conrelid = 'public.backup_runs'::regclass
  ) then
    alter table public.backup_runs
      add constraint backup_runs_status_allowed check (status in ('scheduled', 'running', 'completed', 'failed'));
  end if;
end;
$$;

alter table public.user_profiles enable row level security;
alter table public.manifestations enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.manifestation_jobs enable row level security;
alter table public.admin_actions enable row level security;
alter table public.system_audit_logs enable row level security;
alter table public.data_retention_policies enable row level security;
alter table public.backup_runs enable row level security;

drop policy if exists "Users can view own profile" on public.user_profiles;
drop policy if exists "Users can insert own empty profile" on public.user_profiles;
drop policy if exists "Users can view own manifestations" on public.manifestations;
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Users can view own manifestation jobs" on public.manifestation_jobs;

create policy "Users can view own profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own empty profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and manifestation_count = 0
    and bonus_searches = 0
    and last_manifestation is null
  );

create policy "Users can view own manifestations"
  on public.manifestations
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can view own payments"
  on public.payments
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can view own manifestation jobs"
  on public.manifestation_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists manifestations_active_reservations_idx
  on public.manifestations(user_id, status, reservation_expires_at)
  where status = 'reserved';
create index if not exists payments_unconsumed_entitlements_idx
  on public.payments(user_id, action, fulfilled_at, entitlement_consumed_at)
  where status = 'paid';
create index if not exists webhook_events_status_idx on public.webhook_events(status);
create index if not exists manifestation_jobs_user_created_idx on public.manifestation_jobs(user_id, created_at desc);
create index if not exists manifestation_jobs_status_next_attempt_idx on public.manifestation_jobs(status, next_attempt_at);
create index if not exists manifestation_jobs_timeout_idx on public.manifestation_jobs(status, timeout_at)
  where status in ('queued', 'processing');
create index if not exists admin_actions_admin_created_idx on public.admin_actions(admin_user_id, created_at desc);
create index if not exists system_audit_logs_created_idx on public.system_audit_logs(created_at desc);
create index if not exists backup_runs_created_idx on public.backup_runs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_webhook_events_updated_at on public.webhook_events;
create trigger set_webhook_events_updated_at
before update on public.webhook_events
for each row execute function public.set_updated_at();

drop trigger if exists set_manifestation_jobs_updated_at on public.manifestation_jobs;
create trigger set_manifestation_jobs_updated_at
before update on public.manifestation_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_data_retention_policies_updated_at on public.data_retention_policies;
create trigger set_data_retention_policies_updated_at
before update on public.data_retention_policies
for each row execute function public.set_updated_at();

insert into public.data_retention_policies (id, description, retention_days)
values
  ('webhook_events', 'Retain Stripe webhook payloads for dispute and replay analysis.', 365),
  ('system_audit_logs', 'Retain system audit logs for operational forensics.', 730),
  ('admin_actions', 'Retain admin action history for compliance review.', 1095),
  ('manifestation_jobs', 'Retain async Make job metadata and results.', 365)
on conflict (id) do update
  set description = excluded.description,
      retention_days = excluded.retention_days;

drop function if exists public.fulfill_paid_payment(text, text, uuid, text, text, integer, text);

create or replace function public.fulfill_paid_payment(
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_user_id uuid,
  p_product_id text,
  p_action text,
  p_amount_total integer,
  p_currency text,
  p_stripe_price_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_payment public.payments;
begin
  if p_stripe_checkout_session_id is null or char_length(p_stripe_checkout_session_id) < 8 then
    raise exception 'invalid_checkout_session' using errcode = '22023';
  end if;

  if p_user_id is null then
    raise exception 'invalid_user' using errcode = '22023';
  end if;

  if p_action not in ('complete_108', 'one_more_try') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  if p_amount_total <= 0 or lower(p_currency) <> 'usd' then
    raise exception 'invalid_amount_or_currency' using errcode = '22023';
  end if;

  insert into public.user_profiles (id, email, name)
  select users.id, users.email, coalesce(split_part(users.email, '@', 1), 'User')
  from auth.users
  where users.id = p_user_id
  on conflict (id) do nothing;

  insert into public.payments (
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_price_id,
    user_id,
    product_id,
    action,
    amount_total,
    currency,
    status
  )
  values (
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id,
    p_stripe_price_id,
    p_user_id,
    p_product_id,
    p_action,
    p_amount_total,
    lower(p_currency),
    'paid'
  )
  on conflict (stripe_checkout_session_id) do update
    set stripe_payment_intent_id = coalesce(public.payments.stripe_payment_intent_id, excluded.stripe_payment_intent_id),
        stripe_price_id = coalesce(public.payments.stripe_price_id, excluded.stripe_price_id),
        status = 'paid';

  select *
  into v_payment
  from public.payments
  where stripe_checkout_session_id = p_stripe_checkout_session_id
  for update;

  if v_payment.user_id <> p_user_id
    or v_payment.product_id <> p_product_id
    or v_payment.action <> p_action
    or v_payment.amount_total <> p_amount_total
    or v_payment.currency <> lower(p_currency)
    or (p_stripe_price_id is not null and v_payment.stripe_price_id is distinct from p_stripe_price_id) then
    raise exception 'payment_metadata_mismatch' using errcode = '22023';
  end if;

  if v_payment.fulfilled_at is not null then
    return false;
  end if;

  update public.payments
  set fulfilled_at = now(),
      stripe_price_id = coalesce(stripe_price_id, p_stripe_price_id),
      status = 'paid'
  where id = v_payment.id
    and fulfilled_at is null;

  if p_action = 'one_more_try' then
    update public.user_profiles
    set bonus_searches = bonus_searches + 1
    where id = p_user_id;
  end if;

  return true;
end;
$$;

create or replace function public.reserve_manifestation_attempt(
  p_user_id uuid,
  p_mode text,
  p_query text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles;
  v_manifestation public.manifestations;
  v_payment public.payments;
  v_monthly_available boolean := false;
  v_used_monthly boolean := false;
  v_used_bonus boolean := false;
  v_reserved_monthly_count integer := 0;
  v_reserved_bonus_count integer := 0;
  v_reservation_expires_at timestamptz := now() + interval '15 minutes';
begin
  if p_user_id is null then
    raise exception 'invalid_user' using errcode = '22023';
  end if;

  if p_mode not in ('default', 'complete_108') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  if p_query is null or char_length(trim(p_query)) = 0 or char_length(trim(p_query)) > 500 then
    raise exception 'invalid_query' using errcode = '22023';
  end if;

  insert into public.user_profiles (id, email, name)
  select users.id, users.email, coalesce(split_part(users.email, '@', 1), 'User')
  from auth.users
  where users.id = p_user_id
  on conflict (id) do nothing;

  select *
  into v_profile
  from public.user_profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if p_mode = 'complete_108' then
    update public.payments p
    set entitlement_consumed_at = null,
        entitlement_expires_at = null
    where p.user_id = p_user_id
      and p.action = 'complete_108'
      and p.status = 'paid'
      and p.entitlement_consumed_at is not null
      and p.entitlement_expires_at is not null
      and p.entitlement_expires_at < now()
      and not exists (
        select 1
        from public.manifestations m
        where m.payment_id = p.id
          and m.status = 'completed'
      );

    select *
    into v_payment
    from public.payments
    where user_id = p_user_id
      and action = 'complete_108'
      and status = 'paid'
      and fulfilled_at is not null
      and entitlement_consumed_at is null
    order by fulfilled_at asc nulls last, created_at asc
    for update skip locked
    limit 1;

    if not found then
      raise exception 'paid_entitlement_required' using errcode = 'P0001';
    end if;

    update public.payments
    set entitlement_consumed_at = now(),
        entitlement_expires_at = v_reservation_expires_at
    where id = v_payment.id
    returning * into v_payment;
  else
    select count(*)
    into v_reserved_monthly_count
    from public.manifestations
    where user_id = p_user_id
      and status = 'reserved'
      and mode = 'default'
      and used_monthly
      and reservation_expires_at > now();

    select count(*)
    into v_reserved_bonus_count
    from public.manifestations
    where user_id = p_user_id
      and status = 'reserved'
      and mode = 'default'
      and used_bonus
      and reservation_expires_at > now();

    v_monthly_available :=
      (
        v_profile.last_manifestation is null
        or v_profile.last_manifestation < now() - interval '30 days'
      )
      and v_reserved_monthly_count = 0;

    if v_monthly_available then
      v_used_monthly := true;
    elsif v_profile.bonus_searches - v_reserved_bonus_count > 0 then
      v_used_bonus := true;
    else
      raise exception 'manifestation_limit_exceeded' using errcode = 'P0001';
    end if;
  end if;

  insert into public.manifestations (
    user_id,
    query,
    status,
    mode,
    payment_id,
    used_monthly,
    used_bonus,
    reservation_expires_at
  )
  values (
    p_user_id,
    trim(p_query),
    'reserved',
    p_mode,
    v_payment.id,
    v_used_monthly,
    v_used_bonus,
    v_reservation_expires_at
  )
  returning * into v_manifestation;

  return jsonb_build_object(
    'manifestationId', v_manifestation.id,
    'paymentId', v_manifestation.payment_id
  );
end;
$$;

create or replace function public.finalize_manifestation_attempt(
  p_user_id uuid,
  p_manifestation_id uuid,
  p_response text
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.user_profiles;
  v_manifestation public.manifestations;
begin
  if p_user_id is null or p_manifestation_id is null then
    raise exception 'invalid_manifestation' using errcode = '22023';
  end if;

  if p_response is null or char_length(p_response) > 20000 then
    raise exception 'invalid_response' using errcode = '22023';
  end if;

  select *
  into v_manifestation
  from public.manifestations
  where id = p_manifestation_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'manifestation_not_found' using errcode = 'P0001';
  end if;

  if v_manifestation.status <> 'reserved' then
    raise exception 'manifestation_not_reserved' using errcode = 'P0001';
  end if;

  if v_manifestation.reservation_expires_at is null or v_manifestation.reservation_expires_at <= now() then
    raise exception 'manifestation_reservation_expired' using errcode = 'P0001';
  end if;

  select *
  into v_profile
  from public.user_profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if v_manifestation.used_bonus and v_profile.bonus_searches <= 0 then
    raise exception 'manifestation_limit_exceeded' using errcode = 'P0001';
  end if;

  update public.manifestations
  set response = p_response,
      status = 'completed',
      completed_at = now(),
      reservation_expires_at = null,
      failed_at = null
  where id = v_manifestation.id;

  update public.user_profiles
  set
    last_manifestation = now(),
    manifestation_count = manifestation_count + 1,
    bonus_searches = case
      when v_manifestation.used_bonus then bonus_searches - 1
      else bonus_searches
    end
  where id = p_user_id
  returning * into v_profile;

  if v_manifestation.payment_id is not null then
    update public.payments
    set entitlement_expires_at = null
    where id = v_manifestation.payment_id;
  end if;

  return v_profile;
end;
$$;

create or replace function public.release_manifestation_attempt(
  p_user_id uuid,
  p_manifestation_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_manifestation public.manifestations;
begin
  if p_user_id is null or p_manifestation_id is null then
    raise exception 'invalid_manifestation' using errcode = '22023';
  end if;

  select *
  into v_manifestation
  from public.manifestations
  where id = p_manifestation_id
    and user_id = p_user_id
  for update;

  if not found or v_manifestation.status <> 'reserved' then
    return false;
  end if;

  update public.manifestations
  set status = 'failed',
      response = left(coalesce(p_reason, 'Workflow failed'), 20000),
      failed_at = now(),
      reservation_expires_at = null
  where id = v_manifestation.id;

  if v_manifestation.payment_id is not null then
    update public.payments
    set entitlement_consumed_at = null,
        entitlement_expires_at = null
    where id = v_manifestation.payment_id;
  end if;

  return true;
end;
$$;

revoke all on function public.fulfill_paid_payment(text, text, uuid, text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.fulfill_paid_payment(text, text, uuid, text, text, integer, text, text) to service_role;
revoke all on function public.reserve_manifestation_attempt(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_manifestation_attempt(uuid, text, text) to service_role;
revoke all on function public.finalize_manifestation_attempt(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.finalize_manifestation_attempt(uuid, uuid, text) to service_role;
revoke all on function public.release_manifestation_attempt(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.release_manifestation_attempt(uuid, uuid, text) to service_role;

do $$
begin
  if to_regprocedure('public.record_manifestation(text, text)') is not null then
    revoke all on function public.record_manifestation(text, text) from public, anon, authenticated;
  end if;
end;
$$;

revoke all on table public.webhook_events from public, anon, authenticated;
revoke all on table public.admin_actions from public, anon, authenticated;
revoke all on table public.system_audit_logs from public, anon, authenticated;
revoke all on table public.data_retention_policies from public, anon, authenticated;
revoke all on table public.backup_runs from public, anon, authenticated;

grant select on public.user_profiles to authenticated;
grant insert on public.user_profiles to authenticated;
grant select on public.manifestations to authenticated;
grant select on public.payments to authenticated;
grant select on public.manifestation_jobs to authenticated;

comment on table public.manifestation_jobs is 'Async Make.com workflow jobs. Added by 0002 for existing deployments.';
comment on table public.admin_actions is 'Admin action history. Service-role only; normal users have no read policy.';
comment on table public.system_audit_logs is 'Operational audit log. Service-role only; normal users have no read policy.';
