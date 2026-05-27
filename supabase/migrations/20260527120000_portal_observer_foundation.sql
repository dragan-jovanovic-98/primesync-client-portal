-- Portal Admin Impersonation — Phase A, Migration 1: observer DB security core.
-- See plans/2026-05-27-portal-admin-impersonation-phase-a-db-core.md
--
-- Introduces a dedicated "observer" principal model so a future minted session can be
-- transparently scoped to one company_id, read-only, without cross-tenant or write access.
-- The current_portal_company_id() edit is STRICTLY ADDITIVE: non-observers resolve exactly
-- as before (coalesce falls through to the original lookup).

-- 1. Whitelist of dedicated observer principals (auth users allowed to carry an
--    impersonation claim). RLS on with NO policies -> deny-by-default to authenticated;
--    only SECURITY DEFINER funcs (run as owner) and the service role read it.
create table public.portal_observers (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  label        text,        -- e.g. "observer for admin <email>"
  created_by   uuid,        -- admin user_profiles.id that provisioned it
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.portal_observers enable row level security;
-- (intentionally no policies)

-- 2. Invariant: an observer principal must be in NEITHER user_profiles NOR portal_users
--    (else it would gain is_admin_user() god-mode or is_portal_admin() write rights).
create or replace function public.assert_observer_disjoint()
returns trigger language plpgsql
set search_path to 'public'
as $$
begin
  if exists (select 1 from public.user_profiles up where up.id = new.auth_user_id) then
    raise exception 'observer auth_user_id % is a dashboard user (user_profiles)', new.auth_user_id;
  end if;
  if exists (select 1 from public.portal_users pu where pu.auth_user_id = new.auth_user_id) then
    raise exception 'observer auth_user_id % is a portal user', new.auth_user_id;
  end if;
  return new;
end $$;

create trigger trg_observer_disjoint
  before insert or update on public.portal_observers
  for each row execute function public.assert_observer_disjoint();

-- 3. Observer predicate (consumed by write-guards in Phase C; created + tested here).
create or replace function public.is_portal_observer()
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.portal_observers o
    where o.auth_user_id = auth.uid() and o.active
  );
$$;

-- 4. STRICTLY ADDITIVE resolver edit. For any non-observer the EXISTS is false -> first
--    branch yields no row -> coalesce falls through to the ORIGINAL query, unchanged.
--    Claim honored ONLY for whitelisted active observers; app_metadata is service-role-only
--    so it cannot be forged.
create or replace function public.current_portal_company_id()
returns text language sql stable security definer
set search_path to 'public'
as $$
  select coalesce(
    ( select (auth.jwt() -> 'app_metadata' ->> 'impersonate_company_id')
      where exists (
        select 1 from public.portal_observers o
        where o.auth_user_id = auth.uid() and o.active
      ) ),
    ( select company_id from public.portal_users
      where auth_user_id = auth.uid() and status = 'active' limit 1 )
  );
$$;
