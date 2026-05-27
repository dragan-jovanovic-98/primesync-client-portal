-- Portal Admin Impersonation — Phase E: close the referrals/referral_link cross-tenant RLS gap.
-- These two tables had RLS DISABLED, so any authenticated principal could read/write ALL
-- companies' referral rows. Both carry a populated company_id (no join needed). No Next.js app
-- code and no DB function reads/writes them; the live writer (n8n / legacy Bubble) authenticates
-- with the service-role key (proven: the provisioning workflow writes RLS-protected clients/
-- locations/assistants), which bypasses RLS — so enabling RLS does not break it.
--
-- Mirrors the standard two-policy pattern used on every other portal table. NO authenticated
-- write policy by design; a future portal "create referral" path will be a guarded RPC.
-- The SELECT policy reuses current_portal_company_id() (impersonation-aware), so admin observers
-- get tenant-scoped referral reads automatically.

alter table public.referrals     enable row level security;
alter table public.referral_link enable row level security;

create policy "Admin users full access" on public.referrals
  for all to authenticated
  using ((select public.is_admin_user())) with check ((select public.is_admin_user()));
create policy "Admin users full access" on public.referral_link
  for all to authenticated
  using ((select public.is_admin_user())) with check ((select public.is_admin_user()));

create policy "Portal users read company referrals" on public.referrals
  for select to authenticated
  using (company_id = (select public.current_portal_company_id()));
create policy "Portal users read company referral link" on public.referral_link
  for select to authenticated
  using (company_id = (select public.current_portal_company_id()));

-- (No INSERT/UPDATE/DELETE policy for `authenticated` by design.)
