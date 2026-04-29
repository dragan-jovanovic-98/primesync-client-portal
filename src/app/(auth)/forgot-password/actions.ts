"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPortalPasswordResetEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

export async function requestPortalPasswordReset(formData: FormData) {
  const emailEntry = formData.get("email");
  const email = typeof emailEntry === "string" ? emailEntry.trim() : "";

  if (!email) {
    redirect("/forgot-password?status=invalid");
  }

  const normalizedEmail = email.toLowerCase();
  const admin = createAdminClient();

  const { data: portalUser } = await admin
    .from("portal_users")
    .select("id, status, has_completed_onboarding, full_name, email")
    .eq("email", normalizedEmail)
    .maybeSingle<{
      id: string;
      status: "invited" | "active" | "disabled";
      has_completed_onboarding: boolean;
      full_name: string | null;
      email: string;
    }>();

  if (!portalUser) {
    redirect("/forgot-password?error=no-account");
  }

  if (portalUser.status === "disabled") {
    redirect("/forgot-password?error=disabled");
  }

  if (!portalUser.has_completed_onboarding) {
    redirect("/forgot-password?error=setup-required");
  }

  const siteUrl = getSiteUrl();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: portalUser.email,
    options: {
      redirectTo: `${siteUrl}/auth/confirm?next=/auth/recover`,
    },
  });

  const actionLink = data?.properties?.action_link;

  if (error || !actionLink) {
    console.error("[portal] generateLink recovery failed:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    redirect("/forgot-password?error=server");
  }

  sendPortalPasswordResetEmail({
    to: portalUser.email,
    fullName: portalUser.full_name,
    resetLink: actionLink,
  }).catch((err) =>
    console.error("[email] portal password reset email failed:", err),
  );

  redirect("/forgot-password?status=sent");
}
