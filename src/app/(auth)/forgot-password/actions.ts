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
  });

  // Use the hashed_token (SSR/PKCE flow) — NOT action_link. action_link points
  // at Supabase's /verify endpoint which redirects with the session in the URL
  // fragment (#access_token=...), which our /auth/confirm route can't read
  // (it parses the query string). Building our own URL with token_hash routes
  // straight through verifyOtp on the server, which sets cookies cleanly.
  const hashedToken = data?.properties?.hashed_token;

  if (error || !hashedToken) {
    console.error("[portal] generateLink recovery failed:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    redirect("/forgot-password?error=server");
  }

  const resetLink = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(
    hashedToken,
  )}&type=recovery&next=${encodeURIComponent("/auth/recover")}`;

  sendPortalPasswordResetEmail({
    to: portalUser.email,
    fullName: portalUser.full_name,
    resetLink,
  }).catch((err) =>
    console.error("[email] portal password reset email failed:", err),
  );

  redirect("/forgot-password?status=sent");
}
