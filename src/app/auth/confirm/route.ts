import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") || "/dashboard";
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (!tokenHash || !type) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("status", "invalid-link");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("status", "invalid-link");
    return NextResponse.redirect(redirectTo);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("status", "invalid-link");
    return NextResponse.redirect(redirectTo);
  }

  const admin = createAdminClient();
  const { data: portalUser } = await admin
    .from("portal_users")
    .select("id, has_completed_onboarding")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!portalUser) {
    await supabase.auth.signOut();
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "no-access");
    return NextResponse.redirect(redirectTo);
  }

  await admin
    .from("portal_users")
    .update({
      status: "active",
      last_sign_in_at: new Date().toISOString(),
    })
    .eq("auth_user_id", user.id);

  if (!portalUser.has_completed_onboarding) {
    redirectTo.pathname = "/onboarding";
  }

  return NextResponse.redirect(redirectTo);
}
