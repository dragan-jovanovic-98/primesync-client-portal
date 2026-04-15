-- Plan A: Call Surface Upgrade
-- Adds reviewed/notes columns to all_client_calls and four SECURITY DEFINER portal RPCs.
-- See plans/2026-04-09-call-surface-upgrade.md for context.

-- =============================================================================
-- 1. Columns on all_client_calls
-- =============================================================================

ALTER TABLE public.all_client_calls
  ADD COLUMN IF NOT EXISTS reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_notes text;

COMMENT ON COLUMN public.all_client_calls.reviewed IS
  'Portal-managed: client has marked this call as reviewed.';
COMMENT ON COLUMN public.all_client_calls.reviewed_at IS
  'Portal-managed: timestamp when the call was marked reviewed.';
COMMENT ON COLUMN public.all_client_calls.reviewed_by IS
  'Portal-managed: portal_users.id of whoever marked the call reviewed.';
COMMENT ON COLUMN public.all_client_calls.client_notes IS
  'Portal-managed: free-text notes added by client portal users (last writer wins).';

-- Partial index on unreviewed rows (the common filter case).
CREATE INDEX IF NOT EXISTS all_client_calls_company_reviewed_idx
  ON public.all_client_calls (company_id, reviewed)
  WHERE reviewed = false;

-- =============================================================================
-- 2. get_portal_calls — list RPC with filtering, pagination, sorting
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_portal_calls(
  p_search text DEFAULT NULL,
  p_direction text DEFAULT NULL,
  p_sentiment text DEFAULT NULL,
  p_agent text DEFAULT NULL,
  p_outcome text DEFAULT NULL,
  p_duration_min int DEFAULT NULL,
  p_duration_max int DEFAULT NULL,
  p_hours text DEFAULT NULL,
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
  call_date timestamptz,
  call_duration_s double precision,
  phone_number bigint,
  call_direction text,
  call_outcome text,
  agent_name text,
  user_sentiment text,
  summary text,
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
      AND (p_sentiment IS NULL OR c.user_sentiment = p_sentiment)
      AND (p_agent     IS NULL OR c.assistant_id = p_agent)
      AND (p_outcome   IS NULL OR c.call_outcome = p_outcome)
      AND (p_duration_min IS NULL OR c.call_duration_s >= p_duration_min)
      AND (p_duration_max IS NULL OR c.call_duration_s <= p_duration_max)
      AND (p_from IS NULL OR c.call_date >= p_from)
      AND (p_to   IS NULL OR c.call_date <= p_to)
      AND (p_hours IS NULL OR (
            (p_hours = 'business'    AND c."Hour" BETWEEN 9 AND 17)
         OR (p_hours = 'after-hours' AND (c."Hour" < 9 OR c."Hour" >= 18))
      ))
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
    f.call_date,
    f.call_duration_s,
    f.phone_number,
    f.call_direction,
    f.call_outcome,
    f.agent_name,
    f.user_sentiment,
    f.summary,
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
  text, text, text, text, text, int, int, text, timestamptz, timestamptz,
  text, text, text, int, int
) FROM public;

GRANT EXECUTE ON FUNCTION public.get_portal_calls(
  text, text, text, text, text, int, int, text, timestamptz, timestamptz,
  text, text, text, int, int
) TO authenticated;

-- =============================================================================
-- 3. get_portal_call — detail RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_portal_call(p_call_id text)
RETURNS public.all_client_calls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_row public.all_client_calls;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_row
  FROM public.all_client_calls
  WHERE call_id = p_call_id AND company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'call not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_portal_call(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_call(text) TO authenticated;

-- =============================================================================
-- 4. set_call_reviewed — write RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_call_reviewed(
  p_call_id text,
  p_reviewed boolean
)
RETURNS public.all_client_calls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_user_id    uuid := current_portal_user_id();
  v_row public.all_client_calls;
BEGIN
  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;

  UPDATE public.all_client_calls
  SET reviewed    = p_reviewed,
      reviewed_at = CASE WHEN p_reviewed THEN now() ELSE NULL END,
      reviewed_by = CASE WHEN p_reviewed THEN v_user_id ELSE NULL END
  WHERE call_id = p_call_id AND company_id = v_company_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'call not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_call_reviewed(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_call_reviewed(text, boolean) TO authenticated;

-- =============================================================================
-- 5. set_call_notes — write RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_call_notes(
  p_call_id text,
  p_notes text
)
RETURNS public.all_client_calls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_user_id    uuid := current_portal_user_id();
  v_row public.all_client_calls;
  v_clean text;
BEGIN
  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;

  -- Empty/whitespace-only notes are stored as NULL so the UI can clear notes
  -- by saving an empty string.
  v_clean := nullif(btrim(p_notes), '');

  UPDATE public.all_client_calls
  SET client_notes = v_clean
  WHERE call_id = p_call_id AND company_id = v_company_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'call not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_call_notes(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_call_notes(text, text) TO authenticated;
