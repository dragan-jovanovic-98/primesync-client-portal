-- Plan B: Portal user management + permission enforcement
-- See plans/2026-04-09-portal-user-management-and-permissions.md for context.

-- =============================================================================
-- 1. Owner uniqueness (one owner per company)
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS portal_users_one_owner_per_company
  ON public.portal_users (company_id)
  WHERE is_owner = true;

-- =============================================================================
-- 2. Status and role check constraints (defensive)
-- =============================================================================

ALTER TABLE public.portal_users
  ADD CONSTRAINT portal_users_status_chk
  CHECK (status IN ('invited', 'active', 'disabled'));

ALTER TABLE public.portal_users
  ADD CONSTRAINT portal_users_role_chk
  CHECK (role IN ('admin', 'staff'));

-- =============================================================================
-- 3. portal_audit_log table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.portal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  actor_portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  target_portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_audit_log_company_idx
  ON public.portal_audit_log (company_id, created_at DESC);

ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Portal admins can read company audit log" ON public.portal_audit_log;
CREATE POLICY "Portal admins can read company audit log"
  ON public.portal_audit_log
  FOR SELECT
  TO authenticated
  USING (is_portal_admin() AND company_id = current_portal_company_id());

COMMENT ON TABLE public.portal_audit_log IS
  'Append-only audit trail for sensitive portal admin actions. Writes happen via admin client from server actions or via SECURITY DEFINER RPCs; reads are gated to admins of the same company.';

-- =============================================================================
-- 4. invite_portal_user RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.invite_portal_user(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text
)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_actor_id   uuid := current_portal_user_id();
  v_row public.portal_users;
BEGIN
  IF v_company_id IS NULL OR v_actor_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT is_portal_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'invalid role' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.portal_users
    WHERE company_id = v_company_id AND lower(email) = lower(p_email)
  ) THEN
    RAISE EXCEPTION 'email already exists for this company' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.portal_users (
    auth_user_id, company_id, email, full_name, role, status, is_owner,
    invited_by, invited_at
  ) VALUES (
    p_auth_user_id, v_company_id, p_email, p_full_name, p_role, 'invited', false,
    v_actor_id, now()
  )
  RETURNING * INTO v_row;

  INSERT INTO public.portal_audit_log (
    company_id, actor_portal_user_id, target_portal_user_id, action, metadata
  ) VALUES (
    v_company_id, v_actor_id, v_row.id, 'user.invited',
    jsonb_build_object('role', p_role, 'email', p_email)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_portal_user(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.invite_portal_user(uuid, text, text, text) TO authenticated;

-- =============================================================================
-- 5. promote_portal_user RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.promote_portal_user(p_target_user_id uuid)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_actor_id   uuid := current_portal_user_id();
  v_row public.portal_users;
BEGIN
  IF v_company_id IS NULL OR v_actor_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT is_portal_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.portal_users
  WHERE id = p_target_user_id AND company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.role = 'admin' THEN
    RAISE EXCEPTION 'user is already an admin' USING ERRCODE = '22023';
  END IF;

  UPDATE public.portal_users
  SET role = 'admin'
  WHERE id = p_target_user_id
  RETURNING * INTO v_row;

  INSERT INTO public.portal_audit_log (
    company_id, actor_portal_user_id, target_portal_user_id, action, metadata
  ) VALUES (
    v_company_id, v_actor_id, v_row.id, 'user.promoted',
    jsonb_build_object('from', 'staff', 'to', 'admin')
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_portal_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.promote_portal_user(uuid) TO authenticated;

-- =============================================================================
-- 6. demote_portal_user RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.demote_portal_user(p_target_user_id uuid)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_actor_id   uuid := current_portal_user_id();
  v_row public.portal_users;
BEGIN
  IF v_company_id IS NULL OR v_actor_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT is_portal_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.portal_users
  WHERE id = p_target_user_id AND company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.is_owner THEN
    RAISE EXCEPTION 'cannot demote the company owner' USING ERRCODE = '42501';
  END IF;
  IF v_row.id = v_actor_id THEN
    RAISE EXCEPTION 'cannot demote yourself' USING ERRCODE = '42501';
  END IF;
  IF v_row.role = 'staff' THEN
    RAISE EXCEPTION 'user is already staff' USING ERRCODE = '22023';
  END IF;

  UPDATE public.portal_users
  SET role = 'staff'
  WHERE id = p_target_user_id
  RETURNING * INTO v_row;

  INSERT INTO public.portal_audit_log (
    company_id, actor_portal_user_id, target_portal_user_id, action, metadata
  ) VALUES (
    v_company_id, v_actor_id, v_row.id, 'user.demoted',
    jsonb_build_object('from', 'admin', 'to', 'staff')
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.demote_portal_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.demote_portal_user(uuid) TO authenticated;

-- =============================================================================
-- 7. disable_portal_user RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.disable_portal_user(p_target_user_id uuid)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id text := current_portal_company_id();
  v_actor_id   uuid := current_portal_user_id();
  v_row public.portal_users;
BEGIN
  IF v_company_id IS NULL OR v_actor_id IS NULL THEN
    RAISE EXCEPTION 'no portal session' USING ERRCODE = '42501';
  END IF;
  IF NOT is_portal_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.portal_users
  WHERE id = p_target_user_id AND company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.is_owner THEN
    RAISE EXCEPTION 'cannot disable the company owner' USING ERRCODE = '42501';
  END IF;
  IF v_row.id = v_actor_id THEN
    RAISE EXCEPTION 'cannot disable yourself' USING ERRCODE = '42501';
  END IF;
  IF v_row.status = 'disabled' THEN
    RAISE EXCEPTION 'user is already disabled' USING ERRCODE = '22023';
  END IF;

  UPDATE public.portal_users
  SET status = 'disabled'
  WHERE id = p_target_user_id
  RETURNING * INTO v_row;

  INSERT INTO public.portal_audit_log (
    company_id, actor_portal_user_id, target_portal_user_id, action, metadata
  ) VALUES (
    v_company_id, v_actor_id, v_row.id, 'user.disabled',
    jsonb_build_object('email', v_row.email, 'role', v_row.role)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.disable_portal_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.disable_portal_user(uuid) TO authenticated;
