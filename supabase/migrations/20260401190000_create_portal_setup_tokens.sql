create table if not exists public.portal_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  portal_user_id uuid not null references public.portal_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists portal_setup_tokens_portal_user_id_idx
  on public.portal_setup_tokens (portal_user_id, created_at desc);

alter table public.portal_setup_tokens enable row level security;

drop policy if exists "Portal admins can read company setup tokens" on public.portal_setup_tokens;
create policy "Portal admins can read company setup tokens"
on public.portal_setup_tokens
for select
to authenticated
using (
  public.is_portal_admin()
  and exists (
    select 1
    from public.portal_users
    where public.portal_users.id = portal_setup_tokens.portal_user_id
      and public.portal_users.company_id = public.current_portal_company_id()
  )
);
