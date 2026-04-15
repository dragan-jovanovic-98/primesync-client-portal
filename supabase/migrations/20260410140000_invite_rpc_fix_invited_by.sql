-- Fix: invite_portal_user was writing current_portal_user_id() (a portal_users.id)
-- into portal_users.invited_by, which has a FK to auth.users(id). The audit log
-- actor stays portal_users.id (that column is correctly typed), but invited_by
-- now uses auth.uid() to match the FK target.

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
  v_company_id       text := current_portal_company_id();
  v_actor_portal_id  uuid := current_portal_user_id();
  v_actor_auth_id    uuid := auth.uid();
  v_row              public.portal_users;
BEGIN
  IF v_company_id IS NULL OR v_actor_portal_id IS NULL THEN
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
    v_actor_auth_id, now()
  )
  RETURNING * INTO v_row;

  INSERT INTO public.portal_audit_log (
    company_id, actor_portal_user_id, target_portal_user_id, action, metadata
  ) VALUES (
    v_company_id, v_actor_portal_id, v_row.id, 'user.invited',
    jsonb_build_object('role', p_role, 'email', p_email)
  );

  RETURN v_row;
END;
$$;
