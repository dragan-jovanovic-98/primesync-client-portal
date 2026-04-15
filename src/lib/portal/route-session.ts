import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RoutePortalSession = {
  companyId: string;
  portalUserId: string;
  role: "admin" | "staff";
};

export async function getRoutePortalSession(): Promise<RoutePortalSession | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("portal_users")
    .select("id, company_id, role, is_owner, status")
    .eq("auth_user_id", user.id)
    .maybeSingle<{
      id: string;
      company_id: string;
      role: "admin" | "staff";
      is_owner: boolean;
      status: "invited" | "active" | "disabled";
    }>();

  if (!membership || membership.status === "disabled") {
    return null;
  }

  return {
    companyId: membership.company_id,
    portalUserId: membership.id,
    role: membership.is_owner ? "admin" : membership.role,
  };
}
