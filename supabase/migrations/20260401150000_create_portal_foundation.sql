-- Primesync Client Portal foundation
-- Additive portal-specific tables and helper functions for auth, notifications, and support.

create table if not exists public.portal_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null references public.clients(company_id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_owner boolean not null default false,
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  has_completed_onboarding boolean not null default false,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  unique (auth_user_id),
  unique (company_id, email)
);

create unique index if not exists portal_users_one_owner_per_company
  on public.portal_users (company_id)
  where is_owner = true;

create index if not exists portal_users_company_id_idx
  on public.portal_users (company_id);

create table if not exists public.portal_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.clients(company_id) on delete cascade,
  portal_user_id uuid references public.portal_users(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  call_id text references public.all_client_calls(call_id) on delete set null,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portal_notifications_company_id_created_at_idx
  on public.portal_notifications (company_id, created_at desc);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.clients(company_id) on delete cascade,
  portal_user_id uuid references public.portal_users(id) on delete set null,
  category text not null check (
    category in ('agent_changes', 'billing_question', 'technical_issue', 'account_access', 'other')
  ),
  status text not null default 'open' check (
    status in ('open', 'in_progress', 'resolved', 'closed')
  ),
  subject text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_company_id_created_at_idx
  on public.support_requests (company_id, created_at desc);

create or replace function public.current_portal_company_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.portal_users
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_portal_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.portal_users
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_users
    where auth_user_id = auth.uid()
      and status = 'active'
      and (role = 'admin' or is_owner = true)
  );
$$;

create or replace function public.set_support_requests_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_support_requests_updated_at on public.support_requests;
create trigger set_support_requests_updated_at
before update on public.support_requests
for each row
execute function public.set_support_requests_updated_at();

alter table public.portal_users enable row level security;
alter table public.portal_notifications enable row level security;
alter table public.support_requests enable row level security;

drop policy if exists "Portal users can read self" on public.portal_users;
create policy "Portal users can read self"
on public.portal_users
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Portal admins can read company users" on public.portal_users;
create policy "Portal admins can read company users"
on public.portal_users
for select
to authenticated
using (
  public.is_portal_admin()
  and company_id = public.current_portal_company_id()
);

drop policy if exists "Portal admins can manage company users" on public.portal_users;
create policy "Portal admins can manage company users"
on public.portal_users
for all
to authenticated
using (
  public.is_portal_admin()
  and company_id = public.current_portal_company_id()
)
with check (
  public.is_portal_admin()
  and company_id = public.current_portal_company_id()
);

drop policy if exists "Portal users can read company notifications" on public.portal_notifications;
create policy "Portal users can read company notifications"
on public.portal_notifications
for select
to authenticated
using (company_id = public.current_portal_company_id());

drop policy if exists "Portal users can update company notifications" on public.portal_notifications;
create policy "Portal users can update company notifications"
on public.portal_notifications
for update
to authenticated
using (company_id = public.current_portal_company_id())
with check (company_id = public.current_portal_company_id());

drop policy if exists "Portal users can read support requests" on public.support_requests;
create policy "Portal users can read support requests"
on public.support_requests
for select
to authenticated
using (company_id = public.current_portal_company_id());

drop policy if exists "Portal users can create support requests" on public.support_requests;
create policy "Portal users can create support requests"
on public.support_requests
for insert
to authenticated
with check (
  company_id = public.current_portal_company_id()
  and (
    portal_user_id is null
    or portal_user_id = public.current_portal_user_id()
  )
);

drop policy if exists "Portal admins can update support requests" on public.support_requests;
create policy "Portal admins can update support requests"
on public.support_requests
for update
to authenticated
using (
  public.is_portal_admin()
  and company_id = public.current_portal_company_id()
)
with check (
  public.is_portal_admin()
  and company_id = public.current_portal_company_id()
);

grant execute on function public.current_portal_company_id() to authenticated;
grant execute on function public.current_portal_user_id() to authenticated;
grant execute on function public.is_portal_admin() to authenticated;
