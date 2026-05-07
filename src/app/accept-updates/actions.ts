"use server";

import { redirect } from "next/navigation";
import {
  getRequestIpAndUserAgent,
  recordConsents,
} from "@/lib/legal/consents";
import { requirePortalSession } from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(input: FormDataEntryValue | null): string {
  if (typeof input !== "string") return "/dashboard";
  if (!input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  return input;
}

function buildRedirect(
  status: "agree-required" | "error",
  nextPath: string,
): string {
  return `/accept-updates?status=${status}&next=${encodeURIComponent(nextPath)}`;
}

export async function completeConsentReacceptance(formData: FormData) {
  const session = await requirePortalSession();
  const nextPath = safeNextPath(formData.get("next"));

  if (formData.get("agree") !== "on") {
    redirect(buildRedirect("agree-required", nextPath));
  }

  try {
    const { ip, userAgent } = await getRequestIpAndUserAgent();
    await recordConsents({
      portalUser: {
        id: session.membership.id,
        company_id: session.membership.company_id,
      },
      ip,
      userAgent,
    });
  } catch (consentError) {
    console.error(
      "[accept-updates] recordConsents failed:",
      consentError,
    );
    redirect(buildRedirect("error", nextPath));
  }

  redirect(nextPath);
}

export async function signOutFromAcceptUpdates() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
