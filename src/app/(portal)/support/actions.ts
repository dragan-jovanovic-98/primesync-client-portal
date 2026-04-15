"use server";

import { redirect } from "next/navigation";
import { requirePortalAction } from "@/lib/portal/session";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function submitSupportRequest(formData: FormData) {
  const session = await requirePortalAction({
    capability: "support.create",
    page: "support",
  });
  const subject = normalizeString(formData.get("subject"));
  const category = normalizeString(formData.get("category"));
  const message = normalizeString(formData.get("message"));

  if (!subject || !category || !message) {
    redirect("/support?status=support-invalid");
  }

  const admin = createAdminClient();

  const [{ data: company }, insertResult] = await Promise.all([
    admin
      .from("clients")
      .select("name")
      .eq("company_id", session.membership.company_id)
      .maybeSingle<{ name: string | null }>(),
    admin.from("support_requests").insert({
      company_id: session.membership.company_id,
      portal_user_id: session.membership.id,
      category,
      status: "open",
      subject,
      message,
      metadata: {
        submittedBy: session.membership.email,
        submitterName: session.membership.full_name,
      },
    }),
  ]);

  if (insertResult.error) {
    redirect("/support?status=support-error");
  }

  const { sendPortalSupportEmail } = await import("@/lib/email");
  sendPortalSupportEmail({
    subject,
    category,
    message,
    client: {
      companyName: company?.name ?? session.membership.company_id,
      companyId: session.membership.company_id,
      submitterName: session.membership.full_name ?? "Unknown",
      submitterEmail: session.membership.email,
    },
  }).catch((err) => console.error("[email] Support email failed:", err));

  redirect("/support?status=support-submitted");
}
