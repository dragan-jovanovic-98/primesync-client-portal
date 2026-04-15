-- Re-enable a disabled portal user.
--
-- Complements disable_portal_user. Admin-only, requires the target to be
-- currently disabled, refuses owner and self targets for consistency, writes
-- a user.reenabled audit row atomically with the status flip.

CREATE OR REPLACE FUNCTION public.reenable_portal_user(p_target_user_id uuid)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id       text := current_portal_company_id();
  v_actor_portal_id  uuid := current_portal_user_id();
  v_row              public.portal_users;
BEGIN
  IF v_company_id IS NULL OR v_actor_portal_id IS NULL THEN
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
    RAISE EXCEPTION 'cannot re-enable the company owner' USING ERRCODE = '42501';
  END IF;
  IF v_row.id = v_actor_portal_id THEN
    RAISE EXCEPTION 'cannot re-enable yourself' USING ERRCODE = '42501';
  END IF;
  IF v_row.status <> 'disabled' THEN
    RAISE EXCEPTION 'user is not disabled' USING ERRCODE = '22023';
  END IF;

  UPDATE public.portal_users
  SET status = 'active'
  WHERE id = p_target_user_id
  RETURNING * INTO v_row;

  INSERT INTO public.portal_audit_log (
    company_id, actor_portal_user_id, target_portal_user_id, action, metadata
  ) VALUES (
    v_company_id, v_actor_portal_id, v_row.id, 'user.reenabled',
    jsonb_build_object('email', v_row.email, 'role', v_row.role)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.reenable_portal_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.reenable_portal_user(uuid) TO authenticated;
