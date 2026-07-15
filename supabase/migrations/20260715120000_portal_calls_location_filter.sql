-- Portal Calls page: location filter + multi-agent filter fix.
--
-- 1. Adds p_location_ids uuid[] — filters via the fleet-standard
--    COALESCE-through-assistants idiom (all_client_calls.location_id has a
--    NULL tail; filtering it directly returns 0 rows for recent calls — the
--    exact bug fixed on the dashboard in 20260602120000). Written as a
--    sargable OR-form rather than COALESCE(c.location_id, <lookup>) = ANY(...)
--    so the common branch (c.location_id set, ~94% of rows) is served by
--    idx_calls_company_location (see 20260715120500) instead of a full company
--    scan — the assistant subquery only evaluates for the NULL-location tail.
--    Logically identical to the COALESCE form. Without this, a Lakeland-scale
--    client (150k+ calls) filtering to a location under the 10001 count cap
--    scanned every company row (~19.5s > the 8s authenticated timeout).
--
-- 2. Converts p_agent text -> p_agents text[]. The portal UI's Agent filter
--    is multi-select and joins selections with "," into one URL param; the
--    old single-value equality (c.assistant_id = 'id1,id2') returned zero
--    rows whenever 2+ agents were selected.
--
-- DROP + CREATE (not CREATE OR REPLACE): the parameter list changes, and an
-- overload would make PostgREST rpc('get_portal_calls', ...) ambiguous.

DROP FUNCTION public.get_portal_calls(
  text, text, text[], text, text[], boolean, integer, integer,
  timestamptz, timestamptz, text, text, text[], text, text,
  integer, integer, integer, integer
);

CREATE FUNCTION public.get_portal_calls(
  p_search text DEFAULT NULL,
  p_direction text DEFAULT NULL,
  p_sentiments text[] DEFAULT NULL,
  p_agents text[] DEFAULT NULL,
  p_outcomes text[] DEFAULT NULL,
  p_outcome_null boolean DEFAULT NULL,
  p_duration_min integer DEFAULT NULL,
  p_duration_max integer DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_reviewed_state text DEFAULT NULL,
  p_hours text DEFAULT NULL,
  p_ended_reason text[] DEFAULT NULL,
  p_sort_by text DEFAULT 'call_date',
  p_sort_order text DEFAULT 'desc',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_time_from_min integer DEFAULT NULL,
  p_time_to_min integer DEFAULT NULL,
  p_location_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(
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
  ended_reason text,
  is_business_hours boolean,
  local_tz text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id text := current_portal_company_id();
  v_total bigint;
  v_order text;
  v_search_digits text := NULLIF(regexp_replace(coalesce(p_search,''), '\D', '', 'g'), '');
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_total FROM (
    SELECT 1
    FROM public.all_client_calls c
    WHERE c.company_id = v_company_id
      AND (p_search IS NULL OR (
            c.summary ILIKE '%' || p_search || '%'
         OR c.transcript ILIKE '%' || p_search || '%'
         OR c.agent_name ILIKE '%' || p_search || '%'
         OR c.call_outcome ILIKE '%' || p_search || '%'
         OR c.call_id ILIKE '%' || p_search || '%'
         OR (v_search_digits IS NOT NULL AND c.phone_number::text ILIKE '%' || v_search_digits || '%')))
      AND (p_direction IS NULL OR c.call_direction = p_direction)
      AND (p_sentiments IS NULL OR c.user_sentiment = ANY(p_sentiments))
      AND (p_agents IS NULL OR c.assistant_id = ANY(p_agents))
      AND (p_location_ids IS NULL
         OR c.location_id = ANY(p_location_ids)
         OR (c.location_id IS NULL AND (SELECT a.location_id FROM public.assistants a WHERE a.assistant_id = c.assistant_id) = ANY(p_location_ids)))
      AND ((p_outcomes IS NULL AND p_outcome_null IS NOT TRUE)
        OR (p_outcomes IS NOT NULL AND c.call_outcome = ANY(p_outcomes))
        OR (p_outcome_null = TRUE AND c.call_outcome IS NULL))
      AND (p_duration_min IS NULL OR c.call_duration_s >= p_duration_min)
      AND (p_duration_max IS NULL OR c.call_duration_s <= p_duration_max)
      AND (p_from IS NULL OR c.call_date >= p_from)
      AND (p_to   IS NULL OR c.call_date <= p_to)
      AND (p_reviewed_state IS NULL OR (
            (p_reviewed_state = 'reviewed'   AND c.reviewed = true)
         OR (p_reviewed_state = 'unreviewed' AND c.reviewed = false)))
      AND (p_hours IS NULL OR public.portal_is_business_hours(c.call_date, c.location_id, c.assistant_id, v_company_id) = (p_hours = 'business'))
      AND (p_ended_reason IS NULL OR c.ended_reason = ANY(p_ended_reason))
      AND (p_time_from_min IS NULL OR p_time_to_min IS NULL OR p_time_from_min = p_time_to_min OR (
            CASE WHEN p_time_from_min < p_time_to_min
              THEN public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, v_company_id) >= p_time_from_min
               AND public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, v_company_id) <  p_time_to_min
              ELSE public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, v_company_id) >= p_time_from_min
                OR public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, v_company_id) <  p_time_to_min
            END))
    LIMIT 10001
  ) capped;

  v_order := CASE
    WHEN p_sort_by = 'duration'  AND p_sort_order = 'asc'  THEN 'c.call_duration_s ASC NULLS LAST'
    WHEN p_sort_by = 'duration'                            THEN 'c.call_duration_s DESC NULLS LAST'
    WHEN p_sort_by = 'sentiment' AND p_sort_order = 'asc'  THEN 'c.user_sentiment_num ASC NULLS LAST'
    WHEN p_sort_by = 'sentiment'                           THEN 'c.user_sentiment_num DESC NULLS LAST'
    WHEN p_sort_by = 'call_date' AND p_sort_order = 'asc'  THEN 'c.call_date ASC'
    ELSE 'c.call_date DESC'
  END;

  RETURN QUERY EXECUTE
    $q$
    SELECT
      c.call_id, c.assistant_id, c.location_id, c.call_date, c.call_duration_s,
      c.call_outcome, c.user_sentiment, c.call_direction, c.phone_number, c.summary,
      c.agent_name, c.reviewed, c.ended_reason,
      public.portal_is_business_hours(c.call_date, c.location_id, c.assistant_id, $1) AS is_business_hours,
      public.portal_effective_tz(c.location_id, c.assistant_id, $1) AS local_tz,
      $2::bigint AS total_count
    FROM public.all_client_calls c
    WHERE c.company_id = $1
      AND ($3 IS NULL OR (
            c.summary ILIKE '%' || $3 || '%'
         OR c.transcript ILIKE '%' || $3 || '%'
         OR c.agent_name ILIKE '%' || $3 || '%'
         OR c.call_outcome ILIKE '%' || $3 || '%'
         OR c.call_id ILIKE '%' || $3 || '%'
         OR ($18 IS NOT NULL AND c.phone_number::text ILIKE '%' || $18 || '%')))
      AND ($4 IS NULL OR c.call_direction = $4)
      AND ($5 IS NULL OR c.user_sentiment = ANY($5))
      AND ($6 IS NULL OR c.assistant_id = ANY($6))
      AND ($21 IS NULL
         OR c.location_id = ANY($21)
         OR (c.location_id IS NULL AND (SELECT a.location_id FROM public.assistants a WHERE a.assistant_id = c.assistant_id) = ANY($21)))
      AND (($7 IS NULL AND $8 IS NOT TRUE)
        OR ($7 IS NOT NULL AND c.call_outcome = ANY($7))
        OR ($8 = TRUE AND c.call_outcome IS NULL))
      AND ($9 IS NULL OR c.call_duration_s >= $9)
      AND ($10 IS NULL OR c.call_duration_s <= $10)
      AND ($11 IS NULL OR c.call_date >= $11)
      AND ($12 IS NULL OR c.call_date <= $12)
      AND ($13 IS NULL OR (
            ($13 = 'reviewed'   AND c.reviewed = true)
         OR ($13 = 'unreviewed' AND c.reviewed = false)))
      AND ($14 IS NULL OR public.portal_is_business_hours(c.call_date, c.location_id, c.assistant_id, $1) = ($14 = 'business'))
      AND ($17 IS NULL OR c.ended_reason = ANY($17))
      AND ($19 IS NULL OR $20 IS NULL OR $19 = $20 OR (
            CASE WHEN $19 < $20
              THEN public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, $1) >= $19
               AND public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, $1) <  $20
              ELSE public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, $1) >= $19
                OR public.portal_local_minute_of_day(c.call_date, c.location_id, c.assistant_id, $1) <  $20
            END))
    ORDER BY $q$ || v_order || $q$
    LIMIT $15 OFFSET $16
    $q$
  USING v_company_id, v_total, p_search, p_direction, p_sentiments, p_agents,
        p_outcomes, p_outcome_null, p_duration_min, p_duration_max, p_from, p_to,
        p_reviewed_state, p_hours, p_limit, p_offset, p_ended_reason, v_search_digits,
        p_time_from_min, p_time_to_min, p_location_ids;
END;
$function$;

-- Grant parity with the previous function (PUBLIC EXECUTE also returns by
-- default on CREATE; the function self-guards via current_portal_company_id()).
GRANT EXECUTE ON FUNCTION public.get_portal_calls(
  text, text, text[], text[], text[], boolean, integer, integer,
  timestamptz, timestamptz, text, text, text[], text, text,
  integer, integer, integer, integer, uuid[]
) TO anon, authenticated, service_role;
