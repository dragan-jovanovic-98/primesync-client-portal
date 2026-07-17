-- Add the 'financing' outcome category + de-duplicate portal_outcome_info's
-- raw-string list. Phase B of plans/2026-07-16-giada-demo-dashboard.md (repo 10).
--
-- WHY financing: the GIADA dealership demo cluster routes callers to a Financing
-- department, and financing interest is the most dealership-specific outcome a
-- dealer agent produces. Previously it had nowhere to land: unknown raws fall to
-- 'other', which is disabled/closeRate 0 in portal_revenue_settings, so financing
-- calls would have been counted but scored at $0 and shown as an unlabelled
-- "Other" slice.
--
-- WHY this is a no-op for every existing client: the change is purely additive.
-- The three new raws ('financing_request', 'financing', 'credit_application')
-- are emitted only by dealer agents. No existing mapping changes, so all 34
-- pre-existing raws return an identical (category, tier, value_weight). Existing
-- portal_revenue_settings rows have no 'financing' key, and
-- get_portal_dashboard_metrics treats a missing key as disabled/$0 — so repair
-- clients' revenue math is untouched. (The TS DEFAULT_REVENUE_SETTINGS default
-- for financing is likewise disabled, to match.)
--
-- WHY the rewrite: the original body listed every raw string TWICE — once in the
-- VALUES block and again in a NOT IN (...) catch-all. Adding a raw to one list
-- but not the other makes the function emit two rows (the real mapping AND
-- 'other'), which `LIMIT 1` then resolves non-deterministically — a silent,
-- intermittent wrong answer. The catch-all is now derived from the VALUES block
-- via NOT EXISTS, so the list exists once and cannot drift from itself.
--
-- Equivalence contract (asserted at apply time against the previous definition,
-- for all 34 legacy raws + NULL + an unknown string):
--   known raw   -> its (category, tier, value_weight)
--   NULL        -> ('other','low',0.08)
--   unknown raw -> ('other','low',0.08)
--
-- CREATE OR REPLACE (not DROP) to preserve existing grants.

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
  WITH m(raw, category, tier, value_weight) AS (VALUES
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
    -- financing (high, 0.9) — dealership vertical only
    ('financing_request',      'financing',   'high',   0.9),
    ('financing',              'financing',   'high',   0.9),
    ('credit_application',     'financing',   'high',   0.9),
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
  ),
  hit AS (
    SELECT m.category, m.tier, m.value_weight
    FROM m
    WHERE m.raw = p_outcome
  )
  SELECT * FROM hit
  UNION ALL
  SELECT 'other'::text, 'low'::text, 0.08::numeric
  WHERE NOT EXISTS (SELECT 1 FROM hit)
  LIMIT 1;
$$;
