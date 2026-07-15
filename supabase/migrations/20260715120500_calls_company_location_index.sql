-- Supporting index for the portal Calls location filter (20260715120000).
--
-- get_portal_calls filters on (company_id, location_id) via a sargable OR-form.
-- Without a composite index the count/row passes fell back to a full company
-- scan: on Lakeland (150k+ calls) filtering to a location whose call count is
-- under the 10001 count cap took ~19.5s and blew the 8s authenticated
-- statement_timeout. With this index the same query drops to <2s (and the
-- empty-match case to ~40ms) via a BitmapOr over the two branches
-- (location_id = ANY(...) and location_id IS NULL).
--
-- Created CONCURRENTLY on prod to avoid a write lock on the live call-logging
-- table. NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block;
-- if replaying migrations through a runner that wraps each file in a
-- transaction, run this statement out-of-band (or drop CONCURRENTLY — the table
-- is small enough that the brief lock is tolerable).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_company_location
  ON public.all_client_calls (company_id, location_id);
