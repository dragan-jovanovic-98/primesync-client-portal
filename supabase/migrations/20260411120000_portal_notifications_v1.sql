-- Portal notifications v1
--
-- Tightens portal_notifications to admin-only, adds the read/update RPCs
-- used by the portal UI, and installs a failed-payment trigger on
-- payments_v2 that writes one notification per distinct invoice.
--
-- Notification sources for v1: failed payment only. Upcoming renewals and
-- payment-method-expiring notifications are deferred because neither has a
-- clean event source today.

-- =============================================================================
-- 1. Admin-only RLS on portal_notifications
-- =============================================================================

DROP POLICY IF EXISTS "Portal users can read company notifications" ON public.portal_notifications;
DROP POLICY IF EXISTS "Portal users can update company notifications" ON public.portal_notifications;

CREATE POLICY "Portal admins can read company notifications"
  ON public.portal_notifications
  FOR SELECT
  TO authenticated
  USING (
    public.is_portal_admin()
    AND company_id = public.current_portal_company_id()
  );

CREATE POLICY "Portal admins can update company notifications"
  ON public.portal_notifications
  FOR UPDATE
  TO authenticated
  USING (
    public.is_portal_admin()
    AND company_id = public.current_portal_company_id()
  )
  WITH CHECK (
    public.is_portal_admin()
    AND company_id = public.current_portal_company_id()
  );

-- =============================================================================
-- 2. get_portal_notifications RPC
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_portal_notifications(integer, integer);

-- Notes on naming: the output parameter is named `is_read` (not `read`)
-- because `read` collides with the source column when the function body
-- references both the RETURNS TABLE output slot and the table column in
-- the same statement. Using `is_read` as the output name and aliasing
-- `n.read AS is_read` in the SELECT avoids the ambiguity.

CREATE OR REPLACE FUNCTION public.get_portal_notifications(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  company_id text,
  portal_user_id uuid,
  type text,
  title text,
  message text,
  call_id text,
  is_read boolean,
  metadata jsonb,
  created_at timestamptz,
  total_count bigint,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_total bigint;
  v_unread bigint;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT is_portal_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE NOT n.read)
  INTO v_total, v_unread
  FROM public.portal_notifications n
  WHERE n.company_id = v_company_id;

  RETURN QUERY
  SELECT
    n.id,
    n.company_id,
    n.portal_user_id,
    n.type,
    n.title,
    n.message,
    n.call_id,
    n.read AS is_read,
    n.metadata,
    n.created_at,
    v_total,
    v_unread
  FROM public.portal_notifications n
  WHERE n.company_id = v_company_id
  ORDER BY n.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_portal_notifications(integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_notifications(integer, integer) TO authenticated;

-- =============================================================================
-- 3. mark_portal_notification_read RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_portal_notification_read(
  p_notification_id uuid
)
RETURNS void
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

  UPDATE public.portal_notifications
  SET read = true
  WHERE id = p_notification_id
    AND company_id = v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_portal_notification_read(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_portal_notification_read(uuid) TO authenticated;

-- =============================================================================
-- 4. mark_all_portal_notifications_read RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_all_portal_notifications_read()
RETURNS void
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

  UPDATE public.portal_notifications
  SET read = true
  WHERE company_id = v_company_id
    AND NOT read;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_all_portal_notifications_read() FROM public;
GRANT EXECUTE ON FUNCTION public.mark_all_portal_notifications_read() TO authenticated;

-- =============================================================================
-- 5. Failed-payment trigger on payments_v2
-- =============================================================================
--
-- Fires when a payments_v2 row enters a failure status (either as an INSERT
-- with a failure status, or as an UPDATE that transitions INTO one). Uses an
-- existence check to prevent duplicate notifications per invoice — Stripe can
-- retry a failed payment multiple times and we only want to surface the first
-- failure per invoice.

CREATE OR REPLACE FUNCTION public.portal_notifications_on_payment_failed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_failure boolean;
  v_was_failure boolean;
BEGIN
  v_is_failure := NEW.status IN (
    'failed',
    'requires_payment_method',
    'canceled'
  );

  IF TG_OP = 'UPDATE' THEN
    v_was_failure := OLD.status IN (
      'failed',
      'requires_payment_method',
      'canceled'
    );
  ELSE
    v_was_failure := false;
  END IF;

  -- Only act on transitions into a failure state. Already-failed rows being
  -- updated for unrelated reasons don't produce a new notification.
  IF NOT v_is_failure THEN
    RETURN NEW;
  END IF;
  IF v_was_failure THEN
    RETURN NEW;
  END IF;
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotency: one notification per invoice_id + company_id + type.
  -- A payment with no invoice_id falls back to uniqueness on the payment id
  -- itself (stored in metadata) so direct charges don't spam the feed.
  IF NEW.invoice_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.portal_notifications
      WHERE company_id = NEW.company_id
        AND type = 'billing.payment_failed'
        AND metadata->>'invoice_id' = NEW.invoice_id
    ) THEN
      RETURN NEW;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.portal_notifications
      WHERE company_id = NEW.company_id
        AND type = 'billing.payment_failed'
        AND metadata->>'payment_id' = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.portal_notifications (
    company_id, type, title, message, metadata
  ) VALUES (
    NEW.company_id,
    'billing.payment_failed',
    'Payment failed',
    'We were unable to process your most recent payment. Please update your payment method or contact support.',
    jsonb_build_object(
      'link', '/billing',
      'invoice_id', NEW.invoice_id,
      'payment_id', NEW.id,
      'stripe_payment_intent_id', NEW.stripe_payment_intent_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portal_notifications_payment_failed_trigger ON public.payments_v2;
CREATE TRIGGER portal_notifications_payment_failed_trigger
AFTER INSERT OR UPDATE OF status ON public.payments_v2
FOR EACH ROW
EXECUTE FUNCTION public.portal_notifications_on_payment_failed();
