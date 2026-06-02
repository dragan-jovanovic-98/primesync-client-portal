-- Fix: the Billing "Usage This Cycle" chart and the Usage tab were empty when
-- viewed through the admin "View as Client" impersonation flow. Observer
-- principals have no portal_users row by design, so is_portal_admin() returns
-- false and these two read-only RPCs raised 'forbidden', which the portal
-- swallows into an empty render.
--
-- Allow whitelisted observers (same predicate current_portal_company_id()
-- already honors) through the gate. Tenant isolation is still enforced by
-- current_portal_company_id(); both RPCs are read-only SELECTs, so this does
-- not weaken the observer read-only invariant.

CREATE OR REPLACE FUNCTION public.get_portal_usage(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_assistant_ids text[] DEFAULT NULL::text[], p_location_ids uuid[] DEFAULT NULL::uuid[], p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(call_id text, call_date timestamp with time zone, call_duration_s double precision, total_cost_client numeric, assistant_id text, agent_name text, location_id uuid, location_name text, call_outcome text, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id text := current_portal_company_id();
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT (is_portal_admin() OR is_portal_observer()) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.get_portal_usage_meter(p_cycle_start timestamp with time zone, p_cycle_end timestamp with time zone, p_timezone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id text := current_portal_company_id();
  v_effective_end timestamptz;
  v_tz text := COALESCE(NULLIF(p_timezone, ''), 'America/Los_Angeles');
  v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT (is_portal_admin() OR is_portal_observer()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_effective_end := LEAST(p_cycle_end, now());

  WITH cycle_calls AS (
    SELECT
      c.call_date,
      COALESCE(c.call_duration_s, 0) AS call_duration_s
    FROM public.all_client_calls c
    WHERE c.company_id = v_company_id
      AND c.call_date >= p_cycle_start
      AND c.call_date <= v_effective_end
  ),
  per_day AS (
    SELECT
      ltp.date_key AS day,
      ROUND((sum(cc.call_duration_s))::numeric / 60.0, 2) AS minutes_used
    FROM cycle_calls cc,
         LATERAL public.portal_local_time_parts(cc.call_date, v_tz) ltp
    GROUP BY 1
  ),
  calendar AS (
    SELECT generate_series(
      (p_cycle_start     AT TIME ZONE v_tz)::date,
      (v_effective_end   AT TIME ZONE v_tz)::date,
      interval '1 day'
    )::date AS day
  )
  SELECT jsonb_build_object(
    'used_minutes', COALESCE((
      SELECT ROUND((sum(call_duration_s))::numeric / 60.0, 2) FROM cycle_calls
    ), 0),
    'daily_series', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date',         to_char(cal.day, 'YYYY-MM-DD'),
          'minutes_used', COALESCE(pd.minutes_used, 0)
        ) ORDER BY cal.day
      )
      FROM calendar cal
      LEFT JOIN per_day pd ON pd.day = cal.day
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
