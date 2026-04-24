-- Portal aggregation RPCs to fix the silent 1,000-row PostgREST cap.
--
-- Before this migration, three portal surfaces aggregated calls in Next.js
-- after fetching raw rows from all_client_calls — the default PostgREST 1,000-
-- row limit silently capped every downstream metric:
--
--   1. /dashboard — totalCalls / minutesTalked / outcome chart / hours split /
--      hourly+daily volume / agent performance (and previous-period trends)
--   2. /billing   — usage meter (used minutes) + daily usage chart
--   3. /calls?hours=business|after — 5,000-row JS bandaid, still a hardcoded
--      ceiling that scales badly
--
-- This migration moves all of that into SECURITY DEFINER RPCs that aggregate
-- in Postgres and return nested JSONB (or a paginated TABLE for calls). Three
-- reusable helpers underpin the RPCs: outcome-category mapping, timezone-aware
-- local-time extraction, and business-hours classification.
--
-- Section map:
--   1. portal_outcome_info          — raw outcome → (category, tier, value_weight)
--   2. portal_local_time_parts      — timestamptz + tz → (weekday, minutes, etc.)
--   3. portal_is_business_hours     — classify a call as in/out of business hours
--   4. get_portal_dashboard_metrics — single JSONB payload for /dashboard
--   5. get_portal_usage_meter       — single JSONB payload for /billing meter + chart
--   6. get_portal_calls             — extended with p_hours + is_business_hours
--   7. Grants
--
-- Plan: plans/2026-04-24-aggregation-rpcs-to-fix-1000-row-cap.md

SET search_path = public;

-- ---------------------------------------------------------------------------
-- SECTION 1: Outcome category + tier helper
-- ---------------------------------------------------------------------------
-- Mirrors OUTCOME_MAP / OUTCOME_TIERS / OUTCOME_VALUE_WEIGHTS in
-- app/src/lib/call-outcomes.ts. If a raw outcome isn't recognized (including
-- NULL), returns ('other', 'low', 0.08) matching getOutcomeCategory()'s default.
--
-- Intentionally duplicated into SQL (rather than a new table) — mapping has
-- been stable and any drift surfaces during validation as UI-vs-math mismatch.

CREATE OR REPLACE FUNCTION public.portal_outcome_info(p_outcome text)
RETURNS TABLE (
  category text,
  tier text,
  value_weight numeric
)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT
    m.category,
    m.tier,
    m.value_weight
  FROM (VALUES
    -- appointment (high, 1.0)
    ('appointment_request',    'appointment', 'high',   1.0::numeric),
    ('appointment_link',       'appointment', 'high',   1.0),
    ('appointment',            'appointment', 'high',   1.0),
    ('scheduleAppointment',    'appointment', 'high',   1.0),
    ('send_appointment',       'appointment', 'high',   1.0),
    ('send_link',              'appointment', 'high',   1.0),
    ('request_inspection',     'appointment', 'high',   1.0),
    ('service_request',        'appointment', 'high',   1.0),
    ('submit_service_ticket',  'appointment', 'high',   1.0),
    -- message (medium, 0.2)
    ('message',                'message',     'medium', 0.2),
    ('leave_message',          'message',     'medium', 0.2),
    ('leaveMessage',           'message',     'medium', 0.2),
    ('get_sms',                'message',     'medium', 0.2),
    ('send_message',           'message',     'medium', 0.2),
    ('send_first_sms',         'message',     'medium', 0.2),
    -- quote (high, 0.7)
    ('quote',                  'quote',       'high',   0.7),
    ('quote_request',          'quote',       'high',   0.7),
    -- urgent (high, 0.85)
    ('urgent_message',         'urgent',      'high',   0.85),
    ('urgent_request',         'urgent',      'high',   0.85),
    -- towing (high, 0.9)
    ('contactTow',             'towing',      'high',   0.9),
    ('contactTow_no_sms',      'towing',      'high',   0.9),
    ('contact_tow',            'towing',      'high',   0.9),
    -- transfer (medium, 0.25)
    ('transfer',               'transfer',    'medium', 0.25),
    ('contact_laurel',         'transfer',    'medium', 0.25),
    -- voicemail (low, 0.05)
    ('voicemail',              'voicemail',   'low',    0.05),
    -- general_inquiry (medium, 0.15)
    ('general_inquiry',        'general_inquiry', 'medium', 0.15),
    ('findRepairOrder',        'general_inquiry', 'medium', 0.15),
    ('findCustomer',           'general_inquiry', 'medium', 0.15),
    ('findVehicle',            'general_inquiry', 'medium', 0.15),
    ('createVehicle',          'general_inquiry', 'medium', 0.15),
    ('shop_directions',        'general_inquiry', 'medium', 0.15),
    ('send_directions',        'general_inquiry', 'medium', 0.15),
    -- reschedule_cancel (low, 0.1)
    ('reschedule',             'reschedule_cancel', 'low', 0.1),
    ('cancel',                 'reschedule_cancel', 'low', 0.1)
  ) AS m(raw, category, tier, value_weight)
  WHERE m.raw = p_outcome
  UNION ALL
  SELECT 'other'::text, 'low'::text, 0.08::numeric
  WHERE p_outcome IS NULL
     OR p_outcome NOT IN (
      'appointment_request','appointment_link','appointment','scheduleAppointment',
      'send_appointment','send_link','request_inspection','service_request','submit_service_ticket',
      'message','leave_message','leaveMessage','get_sms','send_message','send_first_sms',
      'quote','quote_request',
      'urgent_message','urgent_request',
      'contactTow','contactTow_no_sms','contact_tow',
      'transfer','contact_laurel',
      'voicemail',
      'general_inquiry','findRepairOrder','findCustomer','findVehicle','createVehicle','shop_directions','send_directions',
      'reschedule','cancel'
    )
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- SECTION 2: Local-time extraction helper
-- ---------------------------------------------------------------------------
-- Converts a timestamptz to a record of local-time parts in an arbitrary IANA
-- timezone. Returns the same four fields the JS helper produced so SQL and JS
-- can be compared line-by-line during validation.
--
-- If p_tz is NULL or empty, fall back to America/Los_Angeles to match
-- FALLBACK_TIME_ZONE in dashboard/calls/actions.ts.

CREATE OR REPLACE FUNCTION public.portal_local_time_parts(
  p_ts timestamptz,
  p_tz text
)
RETURNS TABLE (
  weekday text,    -- 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  minutes int,     -- minutes since local midnight (0..1439)
  month_day text,  -- 'MM-DD' in local date
  date_key date    -- local civil date
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  WITH local_ts AS (
    SELECT (p_ts AT TIME ZONE COALESCE(NULLIF(p_tz, ''), 'America/Los_Angeles'))::timestamp AS lt
  )
  SELECT
    -- EXTRACT(DOW) returns 0 (Sun) .. 6 (Sat); convert to the 3-letter codes
    -- used by the business_hours JSONB.
    CASE EXTRACT(DOW FROM lt)::int
      WHEN 0 THEN 'sun'
      WHEN 1 THEN 'mon'
      WHEN 2 THEN 'tue'
      WHEN 3 THEN 'wed'
      WHEN 4 THEN 'thu'
      WHEN 5 THEN 'fri'
      WHEN 6 THEN 'sat'
    END AS weekday,
    (EXTRACT(HOUR FROM lt)::int * 60 + EXTRACT(MINUTE FROM lt)::int) AS minutes,
    to_char(lt, 'MM-DD') AS month_day,
    lt::date AS date_key
  FROM local_ts;
$$;

-- ---------------------------------------------------------------------------
-- SECTION 3: Business-hours classification helper
-- ---------------------------------------------------------------------------
-- Port of isWithinBusinessHours() from dashboard/actions.ts and calls/
-- actions.ts. Fallback chain (matches JS exactly):
--
--   1. Resolve location: p_location_id > assistant.location_id > null
--   2. Resolve timezone: location.timezone > clients.timezone > America/Los_Angeles
--   3. If no location row or no business_hours JSONB: window is 09:00..17:00
--   4. If the day is a closure (recurring MM-DD or one-off full date): after-hours
--   5. Otherwise: compare local minutes against the day's open/close window,
--      honoring wrap-around (open > close implies overnight e.g. 22:00..06:00)
--
-- STABLE because it reads mutable tables (locations, closures, clients).

CREATE OR REPLACE FUNCTION public.portal_is_business_hours(
  p_call_date timestamptz,
  p_location_id uuid,
  p_assistant_id text,
  p_company_id text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  v_resolved_location_id uuid;
  v_location_tz text;
  v_company_tz text;
  v_effective_tz text;
  v_business_hours jsonb;
  v_local_parts record;
  v_day_schedule jsonb;
  v_open_hhmm text;
  v_close_hhmm text;
  v_open_min int;
  v_close_min int;
  v_is_closure boolean;
  k_fallback_open CONSTANT int := 9 * 60;    -- 09:00 local
  k_fallback_close CONSTANT int := 17 * 60;  -- 17:00 local
BEGIN
  IF p_call_date IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Resolve location: explicit > assistant's location > none.
  v_resolved_location_id := p_location_id;
  IF v_resolved_location_id IS NULL AND p_assistant_id IS NOT NULL THEN
    SELECT a.location_id
      INTO v_resolved_location_id
      FROM public.assistants a
      WHERE a.assistant_id = p_assistant_id
        AND a.company_id   = p_company_id
      LIMIT 1;
  END IF;

  -- 2. Resolve timezone and (for later) business_hours from the location row.
  IF v_resolved_location_id IS NOT NULL THEN
    SELECT l.timezone, l.business_hours
      INTO v_location_tz, v_business_hours
      FROM public.locations l
      WHERE l.id = v_resolved_location_id;
  END IF;

  SELECT c.timezone
    INTO v_company_tz
    FROM public.clients c
    WHERE c.company_id = p_company_id
    LIMIT 1;

  v_effective_tz := COALESCE(NULLIF(v_location_tz, ''), NULLIF(v_company_tz, ''), 'America/Los_Angeles');

  -- 3. Compute local parts.
  SELECT * INTO v_local_parts FROM public.portal_local_time_parts(p_call_date, v_effective_tz);

  -- 4. If no location row or no business_hours: use 09-17 fallback (no closure
  --    check possible without a location).
  IF v_resolved_location_id IS NULL OR v_business_hours IS NULL THEN
    RETURN v_local_parts.minutes >= k_fallback_open
       AND v_local_parts.minutes <  k_fallback_close;
  END IF;

  -- 5. Closure check: recurring uses MM-DD, one-off uses full date match.
  SELECT EXISTS(
    SELECT 1 FROM public.location_closures lc
    WHERE lc.location_id = v_resolved_location_id
      AND (
        (lc.recurring = true  AND to_char(lc.closure_date, 'MM-DD') = v_local_parts.month_day)
        OR
        (lc.recurring = false AND lc.closure_date = v_local_parts.date_key)
      )
  ) INTO v_is_closure;
  IF v_is_closure THEN
    RETURN false;
  END IF;

  -- 6. Day schedule lookup from business_hours JSONB.
  v_day_schedule := v_business_hours -> v_local_parts.weekday;
  v_open_hhmm    := v_day_schedule ->> 'open';
  v_close_hhmm   := v_day_schedule ->> 'close';
  IF v_open_hhmm IS NULL OR v_close_hhmm IS NULL THEN
    RETURN v_local_parts.minutes >= k_fallback_open
       AND v_local_parts.minutes <  k_fallback_close;
  END IF;

  -- 7. Parse HH:MM to minutes. Fall back on parse errors.
  BEGIN
    v_open_min  := split_part(v_open_hhmm,  ':', 1)::int * 60 + split_part(v_open_hhmm,  ':', 2)::int;
    v_close_min := split_part(v_close_hhmm, ':', 1)::int * 60 + split_part(v_close_hhmm, ':', 2)::int;
  EXCEPTION WHEN others THEN
    RETURN v_local_parts.minutes >= k_fallback_open
       AND v_local_parts.minutes <  k_fallback_close;
  END;

  -- 8. Apply the window, honoring wrap-around.
  IF v_open_min = v_close_min THEN
    RETURN true;
  END IF;
  IF v_open_min < v_close_min THEN
    RETURN v_local_parts.minutes >= v_open_min
       AND v_local_parts.minutes <  v_close_min;
  END IF;
  -- wrap-around, e.g. 22:00..06:00 → in-hours if >= open OR < close
  RETURN v_local_parts.minutes >= v_open_min
      OR v_local_parts.minutes <  v_close_min;
END;
$$;

-- ---------------------------------------------------------------------------
-- SECTION 4: get_portal_dashboard_metrics
-- ---------------------------------------------------------------------------
-- One round-trip JSONB payload covering every widget on /dashboard:
--   - current- and previous-period KPIs (calls, minutes, avg duration,
--     conversions, revenue impact) — frontend computes percent trends
--   - outcome groups (category + tier + count + estimated revenue)
--   - business-hours vs. after-hours split
--   - hourly volume (company timezone)
--   - daily volume by weekday (company timezone)
--   - agent performance (every active agent, including idle ones)
--
-- Revenue settings are joined internally; missing row → zeros. company_id is
-- derived from the session via current_portal_company_id() per the portal's
-- SECURITY DEFINER convention; never accept it as a parameter.

CREATE OR REPLACE FUNCTION public.get_portal_dashboard_metrics(
  p_from timestamptz,
  p_to timestamptz,
  p_previous_from timestamptz,
  p_previous_to timestamptz,
  p_location_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
      c.location_id,
      c.call_date,
      COALESCE(c.call_duration_s, 0) AS call_duration_s,
      c.call_outcome,
      oi.category,
      oi.tier
    FROM public.all_client_calls c
    LEFT JOIN LATERAL public.portal_outcome_info(c.call_outcome) oi ON true
    WHERE c.company_id = v_company_id
      AND c.call_date >= p_from
      AND c.call_date <= p_to
      AND (p_location_ids IS NULL OR c.location_id = ANY(p_location_ids))
  ),
  previous_calls AS (
    SELECT
      c.call_id,
      COALESCE(c.call_duration_s, 0) AS call_duration_s,
      oi.category
    FROM public.all_client_calls c
    LEFT JOIN LATERAL public.portal_outcome_info(c.call_outcome) oi ON true
    WHERE c.company_id = v_company_id
      AND c.call_date >= p_previous_from
      AND c.call_date <= p_previous_to
      AND (p_location_ids IS NULL OR c.location_id = ANY(p_location_ids))
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
$$;

-- ---------------------------------------------------------------------------
-- SECTION 5: get_portal_usage_meter
-- ---------------------------------------------------------------------------
-- Returns { used_minutes, daily_series:[{date, minutes_used}] } for the
-- billing overview. Walks every day in the cycle window (in the tenant's
-- timezone) so zero-call days still render in the chart. Clamps the end to
-- now() so future-dated rows don't emit ghost bars.
--
-- Admin-gated (is_portal_admin()) to match the existing /billing surface.

CREATE OR REPLACE FUNCTION public.get_portal_usage_meter(
  p_cycle_start timestamptz,
  p_cycle_end timestamptz,
  p_timezone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_effective_end timestamptz;
  v_tz text := COALESCE(NULLIF(p_timezone, ''), 'America/Los_Angeles');
  v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT is_portal_admin() THEN
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
$$;

-- ---------------------------------------------------------------------------
-- SECTION 6: get_portal_calls (extended with p_hours + is_business_hours)
-- ---------------------------------------------------------------------------
-- Replaces the 2026-04-09 revision. Adds:
--   - p_hours text DEFAULT NULL  — 'business' | 'after' | NULL (no filter)
--   - is_business_hours boolean in the return row (SQL-computed, so the
--     action layer no longer hydrates in JS)
--
-- Removes the previous 5,000-row TS bandaid path by moving the classification
-- into SQL alongside pagination and sorting.

DROP FUNCTION IF EXISTS public.get_portal_calls(
  text, text, text[], text, text[], boolean, int, int, timestamptz, timestamptz,
  text, text, text, int, int
);

CREATE OR REPLACE FUNCTION public.get_portal_calls(
  p_search text DEFAULT NULL,
  p_direction text DEFAULT NULL,
  p_sentiments text[] DEFAULT NULL,
  p_agent text DEFAULT NULL,
  p_outcomes text[] DEFAULT NULL,
  p_outcome_null boolean DEFAULT NULL,
  p_duration_min int DEFAULT NULL,
  p_duration_max int DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_reviewed_state text DEFAULT NULL,
  p_hours text DEFAULT NULL,
  p_sort_by text DEFAULT 'call_date',
  p_sort_order text DEFAULT 'desc',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  call_id text,
  assistant_id text,
  location_id uuid,
  call_date timestamptz,
  call_duration_s double precision,
  call_outcome text,
  user_sentiment text,
  call_direction text,
  phone_number bigint,
  summary text,
  agent_name text,
  reviewed boolean,
  is_business_hours boolean,
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

  RETURN QUERY
  WITH filtered AS (
    SELECT c.*
    FROM public.all_client_calls c
    WHERE c.company_id = v_company_id
      AND (p_search IS NULL OR (
            c.summary      ILIKE '%' || p_search || '%'
         OR c.transcript   ILIKE '%' || p_search || '%'
         OR c.agent_name   ILIKE '%' || p_search || '%'
         OR c.call_outcome ILIKE '%' || p_search || '%'
         OR c.call_id      ILIKE '%' || p_search || '%'
      ))
      AND (p_direction IS NULL OR c.call_direction = p_direction)
      AND (p_sentiments IS NULL OR c.user_sentiment = ANY(p_sentiments))
      AND (p_agent IS NULL OR c.assistant_id = p_agent)
      AND (
            (p_outcomes IS NULL AND p_outcome_null IS NOT TRUE)
         OR (p_outcomes IS NOT NULL AND c.call_outcome = ANY(p_outcomes))
         OR (p_outcome_null = TRUE AND c.call_outcome IS NULL)
      )
      AND (p_duration_min IS NULL OR c.call_duration_s >= p_duration_min)
      AND (p_duration_max IS NULL OR c.call_duration_s <= p_duration_max)
      AND (p_from IS NULL OR c.call_date >= p_from)
      AND (p_to   IS NULL OR c.call_date <= p_to)
      AND (p_reviewed_state IS NULL OR (
            (p_reviewed_state = 'reviewed'   AND c.reviewed = true)
         OR (p_reviewed_state = 'unreviewed' AND c.reviewed = false)
      ))
      AND (
        p_hours IS NULL
        OR public.portal_is_business_hours(c.call_date, c.location_id, c.assistant_id, v_company_id)
           = (p_hours = 'business')
      )
  ),
  counted AS (
    SELECT count(*) AS total_count FROM filtered
  )
  SELECT
    f.call_id,
    f.assistant_id,
    f.location_id,
    f.call_date,
    f.call_duration_s,
    f.call_outcome,
    f.user_sentiment,
    f.call_direction,
    f.phone_number,
    f.summary,
    f.agent_name,
    f.reviewed,
    public.portal_is_business_hours(f.call_date, f.location_id, f.assistant_id, v_company_id) AS is_business_hours,
    counted.total_count
  FROM filtered f, counted
  ORDER BY
    CASE WHEN p_sort_by = 'call_date' AND p_sort_order = 'desc' THEN f.call_date END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'call_date' AND p_sort_order = 'asc'  THEN f.call_date END ASC  NULLS LAST,
    CASE WHEN p_sort_by = 'duration'  AND p_sort_order = 'desc' THEN f.call_duration_s END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'duration'  AND p_sort_order = 'asc'  THEN f.call_duration_s END ASC  NULLS LAST,
    CASE WHEN p_sort_by = 'sentiment' AND p_sort_order = 'desc' THEN f.user_sentiment_num END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'sentiment' AND p_sort_order = 'asc'  THEN f.user_sentiment_num END ASC  NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ---------------------------------------------------------------------------
-- SECTION 7: Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.portal_outcome_info(text) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_outcome_info(text) TO authenticated;

REVOKE ALL ON FUNCTION public.portal_local_time_parts(timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_local_time_parts(timestamptz, text) TO authenticated;

REVOKE ALL ON FUNCTION public.portal_is_business_hours(timestamptz, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_is_business_hours(timestamptz, uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_portal_dashboard_metrics(timestamptz, timestamptz, timestamptz, timestamptz, uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_dashboard_metrics(timestamptz, timestamptz, timestamptz, timestamptz, uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.get_portal_usage_meter(timestamptz, timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_usage_meter(timestamptz, timestamptz, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_portal_calls(
  text, text, text[], text, text[], boolean, int, int, timestamptz, timestamptz,
  text, text, text, text, int, int
) FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_calls(
  text, text, text[], text, text[], boolean, int, int, timestamptz, timestamptz,
  text, text, text, text, int, int
) TO authenticated;
