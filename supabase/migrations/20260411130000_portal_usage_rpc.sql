-- Portal usage tracker RPC
--
-- Per-call usage view for the client portal billing page. Returns calls
-- within a date range filtered optionally by assistant and location, with
-- client-facing cost from all_client_calls.total_cost_client. Joins to
-- locations for display name so the action layer doesn't have to N+1.
--
-- Enforces company scoping via current_portal_company_id() and admin-only
-- access via is_portal_admin(). The /billing page itself is admin-only at
-- the route level; this is defense in depth.

CREATE OR REPLACE FUNCTION public.get_portal_usage(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_assistant_ids text[] DEFAULT NULL,
  p_location_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  call_id text,
  call_date timestamptz,
  call_duration_s double precision,
  total_cost_client numeric,
  assistant_id text,
  agent_name text,
  location_id uuid,
  location_name text,
  call_outcome text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT is_portal_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT c.*
    FROM public.all_client_calls c
    WHERE c.company_id = v_company_id
      AND (p_from IS NULL OR c.call_date >= p_from)
      AND (p_to IS NULL OR c.call_date <= p_to)
      AND (p_assistant_ids IS NULL OR c.assistant_id = ANY(p_assistant_ids))
      AND (p_location_ids IS NULL OR c.location_id = ANY(p_location_ids))
  ),
  counted AS (
    SELECT count(*) AS total_count FROM filtered
  )
  SELECT
    f.call_id,
    f.call_date,
    f.call_duration_s,
    f.total_cost_client,
    f.assistant_id,
    f.agent_name,
    f.location_id,
    l.location_name,
    f.call_outcome,
    counted.total_count
  FROM filtered f
  LEFT JOIN public.locations l ON l.id = f.location_id
  CROSS JOIN counted
  ORDER BY f.call_date DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_portal_usage(timestamptz, timestamptz, text[], uuid[], integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_usage(timestamptz, timestamptz, text[], uuid[], integer, integer) TO authenticated;
