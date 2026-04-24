"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePortalPassword } from "@/lib/portal/password";
import {
  getPortalSetupToken,
  markPortalSetupTokenUsed,
} from "@/lib/portal/setup-tokens";

export async function completePortalSetup(formData: FormData) {
  const tokenEntry = formData.get("token");
  const fullNameEntry = formData.get("fullName");
  const passwordEntry = formData.get("password");
  const confirmPasswordEntry = formData.get("confirmPassword");

  const token = typeof tokenEntry === "string" ? tokenEntry.trim() : "";
  const fullName = typeof fullNameEntry === "string" ? fullNameEntry.trim() : "";
  const password = typeof passwordEntry === "string" ? passwordEntry : "";
  const confirmPassword =
    typeof confirmPasswordEntry === "string" ? confirmPasswordEntry : "";

  if (!token || !fullName) {
    redirect(`/setup?token=${encodeURIComponent(token)}&status=invalid`);
  }

  if (password !== confirmPassword) {
    redirect(`/setup?token=${encodeURIComponent(token)}&status=mismatch`);
  }

  const validation = validatePortalPassword(password);
  if (!validation.ok) {
    redirect(
      `/setup?token=${encodeURIComponent(token)}&status=weak-password&reason=${encodeURIComponent(validation.reason)}`,
    );
  }

  const setupToken = await getPortalSetupToken(token);

  if (!setupToken?.portal_user) {
    redirect("/setup?status=invalid-token");
  }

  if (setupToken.used_at || new Date(setupToken.expires_at).getTime() < Date.now()) {
    redirect("/setup?status=expired");
  }

  const portalUser = Array.isArray(setupToken.portal_user)
    ? setupToken.portal_user[0]
    : setupToken.portal_user;

  if (!portalUser?.auth_user_id) {
    redirect("/setup?status=invalid-token");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(portalUser.auth_user_id, {
    password,
    user_metadata: {
      full_name: fullName,
      source: "torqi-client-portal",
    },
  });

  if (error) {
    console.error("[portal] setup updateUserById failed:", {
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
      redirect(
        `/setup?token=${encodeURIComponent(token)}&status=weak-password&reason=${encodeURIComponent(reason)}`,
      );
    }
    redirect(`/setup?token=${encodeURIComponent(token)}&status=error`);
  }

  await admin
    .from("portal_users")
    .update({
      full_name: fullName,
      has_completed_onboarding: true,
      status: "active",
      last_sign_in_at: new Date().toISOString(),
    })
    .eq("id", portalUser.id);

  await markPortalSetupTokenUsed(setupToken.id);

  redirect("/login?status=setup-complete");
}
