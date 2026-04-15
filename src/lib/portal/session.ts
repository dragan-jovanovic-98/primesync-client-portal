import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import {
  canAccessPage,
  getPortalRole,
  requireCapability,
  type PortalCapability,
  type PortalPage,
  type PortalRole,
} from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PortalMembership = {
  id: string;
  auth_user_id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "staff";
  is_owner: boolean;
  status: "invited" | "active" | "disabled";
  has_completed_onboarding: boolean;
};

export type PortalSession = {
  user: User;
  membership: PortalMembership;
  role: PortalRole;
};

const portalUserSelect = `
  id,
  auth_user_id,
  company_id,
  email,
  full_name,
  role,
  is_owner,
  status,
  has_completed_onboarding
`;

const getAuthState = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership } = await supabase
    .from("portal_users")
    .select(portalUserSelect)
    .eq("auth_user_id", user.id)
    .maybeSingle<PortalMembership>();

  if (!membership) {
    return {
      user,
      membership: null,
      role: null,
    };
  }

  return {
    user,
    membership,
    role: getPortalRole(membership.role, membership.is_owner),
  };
});

type RequirePortalSessionOptions = {
  page?: PortalPage;
  allowOnboarding?: boolean;
};

export async function getPortalSession() {
  return getAuthState();
}

export async function requirePortalSession(
  options: RequirePortalSessionOptions = {},
): Promise<PortalSession> {
  const authState = await getAuthState();

  if (!authState?.user) {
    redirect("/login");
  }

  if (!authState.membership) {
    redirect("/login?error=no-access");
  }

  if (authState.membership.status === "disabled") {
    redirect("/login?error=disabled");
  }

  if (!options.allowOnboarding && !authState.membership.has_completed_onboarding) {
    redirect("/onboarding");
  }

  if (options.page && !canAccessPage(authState.role, options.page)) {
    redirect("/dashboard");
  }

  return {
    user: authState.user,
    membership: authState.membership,
    role: authState.role,
  };
}

type RequirePortalActionOptions = {
  capability: PortalCapability;
  page?: PortalPage;
};

/**
 * Server-action authorization helper. Wraps requirePortalSession with an
 * additional capability check. Throws ForbiddenError if the resolved role
 * does not have the capability. Use this as the first line of every server
 * action under app/(portal)/.
 */
export async function requirePortalAction(
  options: RequirePortalActionOptions,
): Promise<PortalSession> {
  const session = await requirePortalSession({ page: options.page });
  requireCapability(session.role, options.capability);
  return session;
}
