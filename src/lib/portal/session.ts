import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import {
  canAccessPage,
  ForbiddenError,
  getPortalRole,
  OBSERVER_READ_CAPABILITIES,
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
  /** True when this is an admin "view as client" observer session (read-only). */
  isImpersonating: boolean;
  /** Admin/AE user id behind the observer session, when impersonating. */
  impersonatorId: string | null;
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

  // Impersonation (admin read-only "view as client"): an observer principal carries a
  // service-role-only app_metadata claim and has NO portal_users row by design. Synthesize
  // a read-only membership from the claim so it can reach portal pages as the company owner
  // would. Trust is layered: app_metadata is unforgeable by portal users, and the DB resolver
  // (current_portal_company_id) honors the claim ONLY for whitelisted observers — so a claim
  // on a non-whitelisted user yields this UI but no data. Read-only is enforced in
  // requirePortalAction (+ at the DB layer, Phase A).
  const appMeta = (user.app_metadata as Record<string, unknown> | null) ?? {};
  const impersonateCompanyId = appMeta.impersonate_company_id;
  if (typeof impersonateCompanyId === "string" && impersonateCompanyId.length > 0) {
    const impersonatorId = appMeta.impersonator_id;
    return {
      user,
      membership: {
        id: `observer:${user.id}`,
        auth_user_id: user.id,
        company_id: impersonateCompanyId,
        email: user.email ?? "",
        full_name: "Admin (read-only view)",
        role: "admin",
        is_owner: true,
        status: "active",
        has_completed_onboarding: true,
      } satisfies PortalMembership,
      role: "admin" as PortalRole,
      isImpersonating: true,
      impersonatorId: typeof impersonatorId === "string" ? impersonatorId : null,
    };
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
      isImpersonating: false,
      impersonatorId: null,
    };
  }

  return {
    user,
    membership,
    role: getPortalRole(membership.role, membership.is_owner),
    isImpersonating: false,
    impersonatorId: null,
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
    isImpersonating: authState.isImpersonating,
    impersonatorId: authState.impersonatorId,
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
  // Read-only enforcement for admin "view as client" observer sessions: deny any
  // capability that is not an explicit read (fail-safe). DB layer (Phase A) also blocks writes.
  if (session.isImpersonating && !OBSERVER_READ_CAPABILITIES.has(options.capability)) {
    throw new ForbiddenError(
      `impersonation session is read-only: capability ${options.capability} denied`,
    );
  }
  requireCapability(session.role, options.capability);
  return session;
}
