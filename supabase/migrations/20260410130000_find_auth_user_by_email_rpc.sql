-- Lookup helper for the portal invite flow.
--
-- PostgREST only routes requests to the public and graphql_public schemas,
-- so .schema("auth").from("users") from the JS client fails with
-- "The schema must be one of the following: public, graphql_public".
-- Wrap the lookup in a SECURITY DEFINER function so the portal admin client
-- can resolve an email to an auth.users.id before calling invite_portal_user.

create or replace function public.find_auth_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.find_auth_user_id_by_email(text) from public;
revoke all on function public.find_auth_user_id_by_email(text) from anon;
revoke all on function public.find_auth_user_id_by_email(text) from authenticated;
grant execute on function public.find_auth_user_id_by_email(text) to service_role;
