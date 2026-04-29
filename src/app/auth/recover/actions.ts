"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validatePortalPassword } from "@/lib/portal/password";

function getRecoverRedirect(status: string, reason?: string) {
  const base = `/auth/recover?status=${status}`;
  return reason ? `${base}&reason=${encodeURIComponent(reason)}` : base;
}

export async function completePortalPasswordReset(formData: FormData) {
  const passwordEntry = formData.get("password");
  const confirmPasswordEntry = formData.get("confirmPassword");

  const password = typeof passwordEntry === "string" ? passwordEntry : "";
  const confirmPassword =
    typeof confirmPasswordEntry === "string" ? confirmPasswordEntry : "";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=invalid-link");
  }

  if (password !== confirmPassword) {
    redirect(getRecoverRedirect("mismatch"));
  }

  const validation = validatePortalPassword(password);
  if (!validation.ok) {
    redirect(getRecoverRedirect("weak-password", validation.reason));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[portal] recover updateUser failed:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    const code = error.code ?? "";
    const message = error.message ?? "";
    const isWeakPassword =
      code === "weak_password" ||
      /password/i.test(message) ||
      /weak/i.test(message);
    if (isWeakPassword) {
      const reason =
        "That password was rejected by our auth provider. It may have appeared in a known breach — choose a different one.";
      redirect(getRecoverRedirect("weak-password", reason));
    }
    redirect(getRecoverRedirect("error"));
  }

  const admin = createAdminClient();
  const { data: portalUser } = await admin
    .from("portal_users")
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ id: string; company_id: string }>();

  if (portalUser) {
    await admin.from("portal_audit_log").insert({
      company_id: portalUser.company_id,
      actor_portal_user_id: portalUser.id,
      target_portal_user_id: portalUser.id,
      action: "password.reset_via_email",
      metadata: {},
    });
  }

  await supabase.auth.signOut();

  redirect("/login?status=password-reset-complete");
}
