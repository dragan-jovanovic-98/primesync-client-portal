-- Portal Admin Impersonation — Phase A, Migration 1b: close the support_requests INSERT
-- read-only hole for observers (found by the Phase A e2e probe).
--
-- The original "Portal users can create support requests" policy authorized inserts by
-- company alone (it allowed portal_user_id IS NULL), which a read-only observer satisfies
-- via the impersonation claim. Add a genuine-portal-membership requirement
-- (current_portal_user_id() IS NOT NULL): true for every real portal user (so their behavior
-- is unchanged), false for observers (who have no portal_users row).

drop policy "Portal users can create support requests" on public.support_requests;

create policy "Portal users can create support requests" on public.support_requests
  for insert to authenticated
  with check (
    company_id = (select public.current_portal_company_id())
    and (select public.current_portal_user_id()) is not null
    and (portal_user_id is null or portal_user_id = (select public.current_portal_user_id()))
  );
