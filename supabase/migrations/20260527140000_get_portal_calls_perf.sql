-- Perf rewrite of get_portal_calls. The /calls page timed out (57014) when an admin
-- impersonated a very-high-volume client (Lakeland: 111k calls) — a page that real portal
-- clients (<2.5k calls) never hit. Three fixes, behavior preserved:
--   1. Index-friendly ORDER BY via dynamic SQL (literal column, no CASE / NULLS LAST) so the
--      default call_date sort uses idx_calls_company_date (backward index scan, ~0.2ms vs a
--      full sort of 111k rows). call_date has 0 NULLs, so dropping NULLS LAST is identical.
--   2. Project only the returned columns (no SELECT c.* / transcript) — nothing wide is
--      materialized.
--   3. Capped total_count (probe LIMIT 10001) — exact for any realistic client (<10k), and
--      "10000+" for huge ones, instead of a 6s count over 111k rows.
-- Signature, filters, tenant scoping (current_portal_company_id), and returned columns are
-- unchanged.

CREATE OR REPLACE FUNCTION public.get_portal_calls(
  p_search text DEFAULT NULL,
  p_direction text DEFAULT NULL,
  p_sentiments text[] DEFAULT NULL,
  p_agent text DEFAULT NULL,
  p_outcomes text[] DEFAULT NULL,
  p_outcome_null boolean DEFAULT NULL,
  p_duration_min integer DEFAULT NULL,
  p_duration_max integer DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_reviewed_state text DEFAULT NULL,
  p_hours text DEFAULT NULL,
  p_sort_by text DEFAULT 'call_date',
  p_sort_order text DEFAULT 'desc',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(call_id text, assistant_id text, location_id uuid, call_date timestamptz,
  call_duration_s double precision, call_outcome text, user_sentiment text, call_direction text,
  phone_number bigint, summary text, agent_name text, reviewed boolean, is_business_hours boolean,
  total_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id text := current_portal_company_id();
  v_total bigint;
  v_order text;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;

  -- Capped total: exact when < 10001, else 10001 ("10000+"). Avoids a slow full count.
  SELECT count(*) INTO v_total FROM (
    SELECT 1
    FROM public.all_client_calls c
    WHERE c.company_id = v_company_id
      AND (p_search IS NULL OR (
            c.summary ILIKE '%' || p_search || '%'
         OR c.transcript ILIKE '%' || p_search || '%'
         OR c.agent_name ILIKE '%' || p_search || '%'
         OR c.call_outcome ILIKE '%' || p_search || '%'
         OR c.call_id ILIKE '%' || p_search || '%'))
      AND (p_direction IS NULL OR c.call_direction = p_direction)
      AND (p_sentiments IS NULL OR c.user_sentiment = ANY(p_sentiments))
      AND (p_agent IS NULL OR c.assistant_id = p_agent)
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
    LIMIT 10001
  ) capped;

  -- Index-friendly ORDER BY from a fixed whitelist (no user text -> no injection).
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
      c.agent_name, c.reviewed,
      public.portal_is_business_hours(c.call_date, c.location_id, c.assistant_id, $1) AS is_business_hours,
      $2::bigint AS total_count
    FROM public.all_client_calls c
    WHERE c.company_id = $1
      AND ($3 IS NULL OR (
            c.summary ILIKE '%' || $3 || '%'
         OR c.transcript ILIKE '%' || $3 || '%'
         OR c.agent_name ILIKE '%' || $3 || '%'
         OR c.call_outcome ILIKE '%' || $3 || '%'
         OR c.call_id ILIKE '%' || $3 || '%'))
      AND ($4 IS NULL OR c.call_direction = $4)
      AND ($5 IS NULL OR c.user_sentiment = ANY($5))
      AND ($6 IS NULL OR c.assistant_id = $6)
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
    ORDER BY $q$ || v_order || $q$
    LIMIT $15 OFFSET $16
    $q$
  USING v_company_id, v_total, p_search, p_direction, p_sentiments, p_agent,
        p_outcomes, p_outcome_null, p_duration_min, p_duration_max, p_from, p_to,
        p_reviewed_state, p_hours, p_limit, p_offset;
END;
$function$;
