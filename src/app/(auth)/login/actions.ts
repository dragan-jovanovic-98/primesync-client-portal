"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getLoginRedirectPath(status: "invalid" | "error") {
  return `/login?status=${status}`;
}

export async function signInWithPassword(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    redirect(getLoginRedirectPath("invalid"));
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = createAdminClient();
  const { data: portalUser } = await admin
    .from("portal_users")
    .select("id, status, has_completed_onboarding")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!portalUser) {
    redirect("/login?error=no-access");
  }

  if (portalUser.status === "disabled") {
    redirect("/login?error=disabled");
  }

  if (!portalUser.has_completed_onboarding) {
    redirect("/login?error=setup-required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    redirect(getLoginRedirectPath("error"));
  }

  await admin
    .from("portal_users")
    .update({ last_sign_in_at: new Date().toISOString() })
    .eq("id", portalUser.id);

  redirect("/dashboard");
}
