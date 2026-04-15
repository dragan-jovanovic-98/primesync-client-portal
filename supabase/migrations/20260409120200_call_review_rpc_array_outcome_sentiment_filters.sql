-- Plan A follow-up #2: change get_portal_calls outcome/sentiment params to arrays.
--
-- The portal's outcome filter is category-based (e.g. "appointment" expands to
-- ['appointment_request', 'appointment_link', ...] via OUTCOME_CATEGORY_VALUES
-- in the action layer). Sentiment can also be multi-valued. The single-value
-- text parameters can't express either case correctly.
--
-- New shape:
--   p_sentiments text[] DEFAULT NULL  -- when set, c.user_sentiment = ANY(...)
--   p_outcomes   text[] DEFAULT NULL  -- when set, c.call_outcome   = ANY(...)
--   p_outcome_null boolean DEFAULT NULL -- when true, OR call_outcome IS NULL
--                                       -- (used by the "other" category)

DROP FUNCTION IF EXISTS public.get_portal_calls(
  text, text, text, text, text, int, int, timestamptz, timestamptz,
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
        -- Outcome filter: include matches in p_outcomes, OR include nulls
        -- when p_outcome_null is true. If both are NULL/false, no filter.
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

REVOKE ALL ON FUNCTION public.get_portal_calls(
  text, text, text[], text, text[], boolean, int, int, timestamptz, timestamptz,
  text, text, text, int, int
) FROM public;

GRANT EXECUTE ON FUNCTION public.get_portal_calls(
  text, text, text[], text, text[], boolean, int, int, timestamptz, timestamptz,
  text, text, text, int, int
) TO authenticated;
