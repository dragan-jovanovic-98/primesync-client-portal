create table if not exists public.portal_revenue_settings (
  company_id text primary key references public.clients(company_id) on delete cascade,
  average_order_value numeric(10,2) not null default 350,
  category_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_portal_revenue_settings_updated_at()
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

drop trigger if exists set_portal_revenue_settings_updated_at on public.portal_revenue_settings;
create trigger set_portal_revenue_settings_updated_at
before update on public.portal_revenue_settings
for each row
execute function public.set_portal_revenue_settings_updated_at();

alter table public.portal_revenue_settings enable row level security;

drop policy if exists "Portal users can read company revenue settings" on public.portal_revenue_settings;
create policy "Portal users can read company revenue settings"
on public.portal_revenue_settings
for select
to authenticated
using (company_id = public.current_portal_company_id());

drop policy if exists "Portal admins can manage company revenue settings" on public.portal_revenue_settings;
create policy "Portal admins can manage company revenue settings"
on public.portal_revenue_settings
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
