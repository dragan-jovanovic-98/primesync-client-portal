-- Fix: portal dashboard "calls by location" filter returned 0 per location for
-- clients whose recent calls have NULL all_client_calls.location_id (Fairway,
-- John's Automotive, Lakeland). The location is always knowable via the
-- assistant, so resolve it the same way the admin dashboard does:
-- COALESCE(call.location_id, assistant.location_id) via a 1:1 LEFT JOIN.
-- All Magic was unaffected (its calls are 100% location-stamped).
--
-- DB-only change. The portal TS passes the correct locations.id UUIDs already.

CREATE OR REPLACE FUNCTION public.get_portal_dashboard_metrics(p_from timestamp with time zone, p_to timestamp with time zone, p_previous_from timestamp with time zone, p_previous_to timestamp with time zone, p_location_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id text := current_portal_company_id();
  v_company_tz text;
  v_aov numeric;
  v_categories jsonb;
  v_revenue_configured boolean;
  v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;

  SELECT c.timezone
    INTO v_company_tz
    FROM public.clients c
    WHERE c.company_id = v_company_id
    LIMIT 1;

  SELECT
    prs.average_order_value,
    prs.category_settings,
    (prs.company_id IS NOT NULL)
    INTO v_aov, v_categories, v_revenue_configured
    FROM public.portal_revenue_settings prs
    WHERE prs.company_id = v_company_id;

  v_aov := COALESCE(v_aov, 0);
  v_categories := COALESCE(v_categories, '{}'::jsonb);
  v_revenue_configured := COALESCE(v_revenue_configured, false);

  WITH current_calls AS (
    SELECT
      c.call_id,
      c.assistant_id,
      -- belt-and-suspenders: fall back to the assistant's location when the
      -- call row's location_id is NULL (matches admin dashboard behaviour)
      COALESCE(c.location_id, a.location_id) AS location_id,
      c.call_date,
      COALESCE(c.call_duration_s, 0) AS call_duration_s,
      c.call_outcome,
      oi.category,
      oi.tier
    FROM public.all_client_calls c
    LEFT JOIN public.assistants a ON a.assistant_id = c.assistant_id
    LEFT JOIN LATERAL public.portal_outcome_info(c.call_outcome) oi ON true
    WHERE c.company_id = v_company_id
      AND c.call_date >= p_from
      AND c.call_date <= p_to
      AND (p_location_ids IS NULL OR COALESCE(c.location_id, a.location_id) = ANY(p_location_ids))
  ),
  previous_calls AS (
    SELECT
      c.call_id,
      COALESCE(c.call_duration_s, 0) AS call_duration_s,
      oi.category
    FROM public.all_client_calls c
    LEFT JOIN public.assistants a ON a.assistant_id = c.assistant_id
    LEFT JOIN LATERAL public.portal_outcome_info(c.call_outcome) oi ON true
    WHERE c.company_id = v_company_id
      AND c.call_date >= p_previous_from
      AND c.call_date <= p_previous_to
      AND (p_location_ids IS NULL OR COALESCE(c.location_id, a.location_id) = ANY(p_location_ids))
  ),
  cur_kpi AS (
    SELECT
      count(*)::int AS total_calls,
      ROUND((COALESCE(sum(call_duration_s), 0))::numeric / 60.0, 2) AS minutes_talked,
      CASE WHEN count(*) = 0 THEN 0::numeric
           ELSE ROUND(avg(call_duration_s)::numeric, 2) END AS avg_duration_s,
      COALESCE(sum(
        CASE
          WHEN (v_categories -> category ->> 'enabled')::boolean IS NOT TRUE THEN 0
          ELSE ((v_categories -> category ->> 'closeRate')::numeric) / 100.0
        END
      ), 0) AS conversions,
      COALESCE(sum(
        CASE
          WHEN (v_categories -> category ->> 'enabled')::boolean IS NOT TRUE THEN 0
          ELSE v_aov * ((v_categories -> category ->> 'closeRate')::numeric / 100.0)
        END
      ), 0) AS revenue_impact
    FROM current_calls
  ),
  prev_kpi AS (
    SELECT
      count(*)::int AS total_calls,
      ROUND((COALESCE(sum(call_duration_s), 0))::numeric / 60.0, 2) AS minutes_talked,
      CASE WHEN count(*) = 0 THEN 0::numeric
           ELSE ROUND(avg(call_duration_s)::numeric, 2) END AS avg_duration_s,
      COALESCE(sum(
        CASE
          WHEN (v_categories -> category ->> 'enabled')::boolean IS NOT TRUE THEN 0
          ELSE ((v_categories -> category ->> 'closeRate')::numeric) / 100.0
        END
      ), 0) AS conversions,
      COALESCE(sum(
        CASE
          WHEN (v_categories -> category ->> 'enabled')::boolean IS NOT TRUE THEN 0
          ELSE v_aov * ((v_categories -> category ->> 'closeRate')::numeric / 100.0)
        END
      ), 0) AS revenue_impact
    FROM previous_calls
  ),
  outcomes AS (
    SELECT
      category,
      tier,
      count(*)::int AS cnt,
      COALESCE(sum(
        CASE WHEN (v_categories -> category ->> 'enabled')::boolean IS TRUE
             THEN ROUND(v_aov * ((v_categories -> category ->> 'closeRate')::numeric / 100.0))
             ELSE 0 END
      ), 0)::int AS estimated_value
    FROM current_calls
    GROUP BY category, tier
  ),
  hours_split AS (
    SELECT
      count(*) FILTER (
        WHERE public.portal_is_business_hours(call_date, location_id, assistant_id, v_company_id) IS TRUE
      ) AS business_hours_calls,
      count(*) FILTER (
        WHERE public.portal_is_business_hours(call_date, location_id, assistant_id, v_company_id) IS FALSE
      ) AS after_hours_calls
    FROM current_calls
  ),
  hourly AS (
    SELECT
      (ltp.minutes / 60) AS hour_bucket,
      count(*)::int AS cnt
    FROM current_calls c,
         LATERAL public.portal_local_time_parts(c.call_date, v_company_tz) ltp
    GROUP BY 1
  ),
  daily AS (
    SELECT
      ltp.weekday,
      count(*)::int AS cnt
    FROM current_calls c,
         LATERAL public.portal_local_time_parts(c.call_date, v_company_tz) ltp
    GROUP BY 1
  ),
  agent_perf AS (
    SELECT
      a.assistant_id,
      a.agent_name,
      count(c.call_id)::int AS total_calls,
      CASE WHEN count(c.call_id) = 0 THEN 0::numeric
           ELSE ROUND(avg(c.call_duration_s)::numeric, 2) END AS avg_duration_s,
      COALESCE(sum(
        CASE
          WHEN (v_categories -> c.category ->> 'enabled')::boolean IS NOT TRUE THEN 0
          ELSE ((v_categories -> c.category ->> 'closeRate')::numeric) / 100.0
        END
      ), 0) AS expected_orders
    FROM public.assistants a
    LEFT JOIN current_calls c ON c.assistant_id = a.assistant_id
    WHERE a.company_id = v_company_id
      AND a.status = true
    GROUP BY a.assistant_id, a.agent_name
  )
  SELECT jsonb_build_object(
    'company_timezone', COALESCE(v_company_tz, 'America/Los_Angeles'),
    'revenue_settings_configured', v_revenue_configured,
    'current', jsonb_build_object(
      'total_calls',    (SELECT total_calls    FROM cur_kpi),
      'minutes_talked', (SELECT minutes_talked FROM cur_kpi),
      'avg_duration_s', (SELECT avg_duration_s FROM cur_kpi),
      'conversions',    (SELECT conversions    FROM cur_kpi),
      'revenue_impact', (SELECT revenue_impact FROM cur_kpi)
    ),
    'previous', jsonb_build_object(
      'total_calls',    (SELECT total_calls    FROM prev_kpi),
      'minutes_talked', (SELECT minutes_talked FROM prev_kpi),
      'avg_duration_s', (SELECT avg_duration_s FROM prev_kpi),
      'conversions',    (SELECT conversions    FROM prev_kpi),
      'revenue_impact', (SELECT revenue_impact FROM prev_kpi)
    ),
    'outcomes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'category',        category,
          'tier',            tier,
          'count',           cnt,
          'estimated_value', estimated_value
        ) ORDER BY cnt DESC
      ) FROM outcomes
    ), '[]'::jsonb),
    'hours_split', jsonb_build_object(
      'business_hours', COALESCE((SELECT business_hours_calls FROM hours_split), 0),
      'after_hours',    COALESCE((SELECT after_hours_calls    FROM hours_split), 0)
    ),
    'hourly_volume', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('hour', hour_bucket, 'count', cnt)
        ORDER BY hour_bucket
      ) FROM hourly
    ), '[]'::jsonb),
    'daily_volume', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('day', weekday, 'count', cnt)
      ) FROM daily
    ), '[]'::jsonb),
    'agent_performance', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'assistant_id',    assistant_id,
          'agent_name',      agent_name,
          'total_calls',     total_calls,
          'avg_duration_s',  avg_duration_s,
          'expected_orders', expected_orders
        ) ORDER BY total_calls DESC
      ) FROM agent_perf
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
