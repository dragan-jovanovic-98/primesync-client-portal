"use server";

import { redirect } from "next/navigation";
import { findOrCreateAuthUser } from "@/lib/portal/admin";
import { validatePortalPassword } from "@/lib/portal/password";
import { createPortalSetupToken } from "@/lib/portal/setup-tokens";
import { requirePortalAction } from "@/lib/portal/session";
import {
  FIXED_REVENUE_CATEGORIES,
  clampPercentage,
  type RevenueCategoryKey,
} from "@/lib/revenue-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendPortalInvitationEmail } from "@/lib/email";
import type { PortalSession } from "@/lib/portal/session";

function getTeamRedirect(status: string) {
  return `/settings/team?status=${status}`;
}

function getOrganizationRedirect(status: string) {
  return `/settings/organization?status=${status}`;
}

function getBillingRedirect(status: string) {
  return `/settings/billing?status=${status}`;
}

function getLocationsRedirect(status: string, locationId?: string) {
  const base = `/settings/locations?status=${status}`;
  return locationId ? `${base}&location=${locationId}` : base;
}

function getAccountRedirect(status: string) {
  return `/settings/account?status=${status}`;
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getTeamRedirectWithLink(status: string, setupLink: string) {
  return `${getTeamRedirect(status)}&setupLink=${encodeURIComponent(setupLink)}`;
}

/**
 * Append a row to portal_audit_log via the admin client. Used by actions
 * whose underlying mutation does NOT happen inside a SECURITY DEFINER RPC
 * (e.g. billing email change). RPC-based actions write their own audit rows
 * inside the function body so the audit and the mutation are atomic.
 */
async function writeAuditLog(opts: {
  session: PortalSession;
  targetPortalUserId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("portal_audit_log").insert({
    company_id: opts.session.membership.company_id,
    actor_portal_user_id: opts.session.membership.id,
    target_portal_user_id: opts.targetPortalUserId ?? null,
    action: opts.action,
    metadata: opts.metadata ?? {},
  });
}

// =============================================================================
// Account (self-only)
// =============================================================================

export async function updatePortalProfile(formData: FormData) {
  const session = await requirePortalAction({
    capability: "settings.account.write",
    page: "settings",
  });
  const fullName = normalizeString(formData.get("fullName"));

  if (!fullName) {
    redirect(getAccountRedirect("profile-invalid"));
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("portal_users")
    .update({ full_name: fullName })
    .eq("id", session.membership.id)
    .eq("company_id", session.membership.company_id);

  if (error) {
    redirect(getAccountRedirect("profile-error"));
  }

  redirect(getAccountRedirect("profile-saved"));
}

export async function updatePortalPassword(formData: FormData) {
  const session = await requirePortalAction({
    capability: "settings.account.write",
    page: "settings",
  });
  const currentPassword = normalizeString(formData.get("currentPassword"));
  const password = normalizeString(formData.get("password"));
  const confirmPassword = normalizeString(formData.get("confirmPassword"));

  if (!currentPassword) {
    redirect(getAccountRedirect("current-password-required"));
  }

  if (password !== confirmPassword) {
    redirect(getAccountRedirect("password-mismatch"));
  }

  const validation = validatePortalPassword(password);
  if (!validation.ok) {
    redirect(
      `/settings/account?status=password-weak&reason=${encodeURIComponent(validation.reason)}`,
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: session.membership.email,
    password: currentPassword,
  });

  if (signInError) {
    redirect(getAccountRedirect("current-password-wrong"));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[portal] updateUser password failed:", {
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
        `/settings/account?status=password-weak&reason=${encodeURIComponent(reason)}`,
      );
    }
    redirect(getAccountRedirect("password-error"));
  }

  redirect(getAccountRedirect("password-updated"));
}

// =============================================================================
// Team / user management
// =============================================================================

export async function invitePortalUser(formData: FormData) {
  const session = await requirePortalAction({
    capability: "team.invite",
    page: "settings",
  });
  const fullName = normalizeString(formData.get("fullName"));
  const email = normalizeEmail(formData.get("email"));
  const roleEntry = formData.get("role");
  const role = roleEntry === "staff" ? "staff" : "admin";

  if (!fullName || !email) {
    redirect(getTeamRedirect("invalid-user"));
  }

  // Check for duplicate email up-front so we surface a friendly error before
  // we create an auth user. The RPC also enforces this, but the early check
  // gives us a cleaner user-facing message and lets us short-circuit. We
  // distinguish between an existing active/invited user (dead-end duplicate)
  // and an existing disabled user (the admin should re-enable them instead).
  const admin = createAdminClient();
  const { data: existingPortalUser } = await admin
    .from("portal_users")
    .select("id, status")
    .eq("company_id", session.membership.company_id)
    .eq("email", email)
    .maybeSingle<{ id: string; status: "invited" | "active" | "disabled" }>();

  if (existingPortalUser) {
    if (existingPortalUser.status === "disabled") {
      redirect(getTeamRedirect("duplicate-user-disabled"));
    }
    redirect(getTeamRedirect("duplicate-user"));
  }

  // Create or look up the auth.users row, then call the RPC which atomically
  // inserts portal_users and writes the user.invited audit row.
  const authUser = await findOrCreateAuthUser({ email, fullName });

  const supabase = await createServerSupabaseClient();
  const { data: createdPortalUser, error } = await supabase.rpc(
    "invite_portal_user",
    {
      p_auth_user_id: authUser.id,
      p_email: email,
      p_full_name: fullName,
      p_role: role,
    },
  );

  if (error || !createdPortalUser) {
    console.error("[portal] invite_portal_user RPC failed:", error);
    redirect(getTeamRedirect("create-error"));
  }

  const setupLink = await createPortalSetupToken({
    portalUserId: createdPortalUser.id,
    createdBy: session.user.id,
  });

  // Look up the company name for the email body. Best-effort — if it fails,
  // fall back to the company_id.
  const { data: company } = await admin
    .from("clients")
    .select("name")
    .eq("company_id", session.membership.company_id)
    .maybeSingle<{ name: string | null }>();

  // Fire-and-forget the email send. If it fails we still return the setup
  // link in the redirect so the admin can copy/paste as a fallback.
  sendPortalInvitationEmail({
    to: email,
    fullName,
    setupLink: setupLink.url,
    invitedByName: session.membership.full_name ?? session.membership.email,
    companyName: company?.name ?? session.membership.company_id,
  }).catch((err) =>
    console.error("[email] portal invitation email failed:", err),
  );

  redirect(getTeamRedirectWithLink("user-created", setupLink.url));
}

export async function promotePortalUser(formData: FormData) {
  await requirePortalAction({
    capability: "team.promote",
    page: "settings",
  });
  const portalUserId = normalizeString(formData.get("portalUserId"));

  if (!portalUserId) {
    redirect(getTeamRedirect("invalid-user"));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("promote_portal_user", {
    p_target_user_id: portalUserId,
  });

  if (error) {
    if (error.message?.includes("user not found")) {
      redirect(getTeamRedirect("invalid-user"));
    }
    if (error.message?.includes("already an admin")) {
      redirect(getTeamRedirect("role-updated"));
    }
    redirect(getTeamRedirect("role-update-error"));
  }

  redirect(getTeamRedirect("role-updated"));
}

export async function demotePortalUser(formData: FormData) {
  await requirePortalAction({
    capability: "team.demote",
    page: "settings",
  });
  const portalUserId = normalizeString(formData.get("portalUserId"));

  if (!portalUserId) {
    redirect(getTeamRedirect("invalid-user"));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("demote_portal_user", {
    p_target_user_id: portalUserId,
  });

  if (error) {
    if (error.message?.includes("owner")) {
      redirect(getTeamRedirect("owner-locked"));
    }
    if (error.message?.includes("yourself")) {
      redirect(getTeamRedirect("self-locked"));
    }
    if (error.message?.includes("user not found")) {
      redirect(getTeamRedirect("invalid-user"));
    }
    if (error.message?.includes("already staff")) {
      redirect(getTeamRedirect("role-updated"));
    }
    redirect(getTeamRedirect("role-update-error"));
  }

  redirect(getTeamRedirect("role-updated"));
}

export async function disablePortalUser(formData: FormData) {
  await requirePortalAction({
    capability: "team.disable",
    page: "settings",
  });
  const portalUserId = normalizeString(formData.get("portalUserId"));

  if (!portalUserId) {
    redirect(getTeamRedirect("invalid-user"));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("disable_portal_user", {
    p_target_user_id: portalUserId,
  });

  if (error) {
    if (error.message?.includes("owner") || error.message?.includes("yourself")) {
      redirect(getTeamRedirect("remove-blocked"));
    }
    if (error.message?.includes("user not found")) {
      redirect(getTeamRedirect("invalid-user"));
    }
    redirect(getTeamRedirect("disable-error"));
  }

  redirect(getTeamRedirect("user-disabled"));
}

export async function reenablePortalUser(formData: FormData) {
  await requirePortalAction({
    capability: "team.reenable",
    page: "settings",
  });
  const portalUserId = normalizeString(formData.get("portalUserId"));

  if (!portalUserId) {
    redirect(getTeamRedirect("invalid-user"));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("reenable_portal_user", {
    p_target_user_id: portalUserId,
  });

  if (error) {
    console.error("[portal] reenable_portal_user RPC failed:", error);
    if (error.message?.includes("user not found")) {
      redirect(getTeamRedirect("invalid-user"));
    }
    if (error.message?.includes("not disabled")) {
      redirect(getTeamRedirect("not-disabled"));
    }
    redirect(getTeamRedirect("reenable-error"));
  }

  redirect(getTeamRedirect("user-reenabled"));
}

export async function regeneratePortalSetupLink(formData: FormData) {
  const session = await requirePortalAction({
    capability: "team.invite",
    page: "settings",
  });
  const portalUserId = normalizeString(formData.get("portalUserId"));

  if (!portalUserId) {
    redirect(getTeamRedirect("invalid-user"));
  }

  const admin = createAdminClient();
  const { data: portalUser } = await admin
    .from("portal_users")
    .select("id, email, full_name")
    .eq("id", portalUserId)
    .eq("company_id", session.membership.company_id)
    .maybeSingle<{ id: string; email: string; full_name: string | null }>();

  if (!portalUser) {
    redirect(getTeamRedirect("invalid-user"));
  }

  const setupLink = await createPortalSetupToken({
    portalUserId,
    createdBy: session.user.id,
  });

  // Best-effort: re-send the invitation email and write an audit row.
  const { data: company } = await admin
    .from("clients")
    .select("name")
    .eq("company_id", session.membership.company_id)
    .maybeSingle<{ name: string | null }>();

  sendPortalInvitationEmail({
    to: portalUser.email,
    fullName: portalUser.full_name ?? "",
    setupLink: setupLink.url,
    invitedByName: session.membership.full_name ?? session.membership.email,
    companyName: company?.name ?? session.membership.company_id,
  }).catch((err) =>
    console.error("[email] portal invitation resend failed:", err),
  );

  await writeAuditLog({
    session,
    targetPortalUserId: portalUserId,
    action: "user.invite_resent",
    metadata: { email: portalUser.email },
  });

  redirect(getTeamRedirectWithLink("setup-link-created", setupLink.url));
}

// =============================================================================
// Organization (admin-only)
// =============================================================================

export async function updatePortalRevenueSettings(formData: FormData) {
  const session = await requirePortalAction({
    capability: "settings.organization.write",
    page: "settings",
  });
  const averageOrderValue = Number(
    normalizeString(formData.get("averageOrderValue")) || "0",
  );

  if (!Number.isFinite(averageOrderValue) || averageOrderValue < 0) {
    redirect(getOrganizationRedirect("invalid-revenue-settings"));
  }

  const categorySettings = FIXED_REVENUE_CATEGORIES.reduce(
    (acc, category) => {
      const enabled = formData.get(`category_enabled_${category.key}`) === "on";
      const closeRate = clampPercentage(
        Number(
          normalizeString(formData.get(`category_close_rate_${category.key}`)) ||
            "0",
        ),
      );

      acc[category.key] = {
        enabled,
        closeRate,
      };

      return acc;
    },
    {} as Record<RevenueCategoryKey, { enabled: boolean; closeRate: number }>,
  );

  const admin = createAdminClient();
  const { error } = await admin.from("portal_revenue_settings").upsert(
    {
      company_id: session.membership.company_id,
      average_order_value: averageOrderValue,
      category_settings: categorySettings,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    redirect(getOrganizationRedirect("revenue-settings-error"));
  }

  redirect(getOrganizationRedirect("revenue-settings-saved"));
}

function parseEmailList(value: string) {
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function updateCompanyProfile(formData: FormData) {
  const session = await requirePortalAction({
    capability: "settings.organization.write",
    page: "settings",
  });
  const name = normalizeString(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const timezone = normalizeString(formData.get("timezone"));
  const industry = normalizeString(formData.get("industry"));
  const reportFrequency = normalizeString(formData.get("reportFrequency"));
  const serviceEmails = parseEmailList(normalizeString(formData.get("serviceEmails")));
  const reportEmails = parseEmailList(normalizeString(formData.get("reportEmails")));

  if (!name || !email || !timezone) {
    redirect(getOrganizationRedirect("company-profile-invalid"));
  }

  // Snapshot the current values so we can write a precise audit row if email
  // or company name changes (those propagate to Stripe via the existing
  // sync trigger).
  const admin = createAdminClient();
  const { data: previous } = await admin
    .from("clients")
    .select("name, email, industry")
    .eq("company_id", session.membership.company_id)
    .maybeSingle<{ name: string | null; email: string | null; industry: string | null }>();

  const { error } = await admin
    .from("clients")
    .update({
      name,
      email,
      timezone,
      industry: industry || null,
      report_frequency: reportFrequency || "none",
      service_emails: serviceEmails,
      report_emails: reportEmails,
    })
    .eq("company_id", session.membership.company_id);

  if (error) {
    redirect(getOrganizationRedirect("company-profile-error"));
  }

  if (previous) {
    if ((previous.email ?? "") !== email) {
      await writeAuditLog({
        session,
        action: "billing.email_changed",
        metadata: { from: previous.email, to: email },
      });
    }
    if ((previous.name ?? "") !== name) {
      await writeAuditLog({
        session,
        action: "org.name_changed",
        metadata: { from: previous.name, to: name },
      });
    }
  }

  redirect(getOrganizationRedirect("company-profile-saved"));
}

// =============================================================================
// Locations
// =============================================================================

export async function updateLocationDetails(formData: FormData) {
  // Location details (name, address, timezone, phone, notification emails)
  // are admin-only. Staff can edit hours/closures via separate actions.
  const session = await requirePortalAction({
    capability: "settings.locations.write_notification_emails",
    page: "settings",
  });
  const locationId = normalizeString(formData.get("locationId"));
  const locationName = normalizeString(formData.get("locationName"));
  const address = normalizeString(formData.get("address"));
  const timezone = normalizeString(formData.get("timezone"));
  const phoneNumber = normalizeString(formData.get("phoneNumber"));
  const notificationEmails = parseEmailList(
    normalizeString(formData.get("notificationEmails")),
  );
  const postCallEmails = parseEmailList(normalizeString(formData.get("postCallEmails")));

  if (!locationId || !locationName || !timezone) {
    redirect(getLocationsRedirect("location-invalid", locationId || undefined));
  }

  const admin = createAdminClient();
  const { data: previous } = await admin
    .from("locations")
    .select("notification_emails")
    .eq("id", locationId)
    .eq("company_id", session.membership.company_id)
    .maybeSingle<{ notification_emails: string[] | null }>();

  const { error } = await admin
    .from("locations")
    .update({
      location_name: locationName,
      address: address || null,
      timezone,
      phone_number: phoneNumber || null,
      notification_emails: notificationEmails,
      post_call_emails: postCallEmails,
    })
    .eq("id", locationId)
    .eq("company_id", session.membership.company_id);

  if (error) {
    redirect(getLocationsRedirect("location-error", locationId));
  }

  // Audit if notification emails actually changed
  const previousEmails = (previous?.notification_emails ?? []).slice().sort();
  const nextEmails = notificationEmails.slice().sort();
  if (JSON.stringify(previousEmails) !== JSON.stringify(nextEmails)) {
    await writeAuditLog({
      session,
      action: "location.notification_emails_changed",
      metadata: {
        location_id: locationId,
        previous_count: previousEmails.length,
        next_count: nextEmails.length,
      },
    });
  }

  redirect(getLocationsRedirect("location-saved", locationId));
}

type BusinessHoursEntry = {
  open?: string | null;
  close?: string | null;
};

type BusinessHoursSchedule = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", BusinessHoursEntry>
>;

const VALID_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function isValidBusinessHours(value: unknown): value is BusinessHoursSchedule {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const [key, entry] of Object.entries(value)) {
    if (!VALID_DAYS.includes(key)) return false;
    if (typeof entry !== "object" || entry === null) return false;
    const { open, close } = entry as BusinessHoursEntry;
    if (typeof open !== "string" || typeof close !== "string") return false;
    if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) return false;
  }
  return true;
}

export async function updateBusinessHours(formData: FormData) {
  // Business hours editing is allowed for both admin AND staff per the v1
  // scope log — that's why this gets the more permissive write_hours
  // capability rather than the admin-only write_notification_emails one.
  const session = await requirePortalAction({
    capability: "settings.locations.write_hours",
    page: "settings",
  });
  const locationId = normalizeString(formData.get("locationId"));
  const hoursJson = normalizeString(formData.get("businessHours"));

  if (!locationId || !hoursJson) {
    redirect(getLocationsRedirect("hours-invalid", locationId || undefined));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(hoursJson);
  } catch {
    redirect(getLocationsRedirect("hours-invalid", locationId));
  }

  if (!isValidBusinessHours(parsed)) {
    redirect(getLocationsRedirect("hours-invalid", locationId));
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("locations")
    .update({ business_hours: parsed })
    .eq("id", locationId)
    .eq("company_id", session.membership.company_id);

  if (error) {
    redirect(getLocationsRedirect("hours-error", locationId));
  }

  redirect(getLocationsRedirect("hours-saved", locationId));
}

// =============================================================================
// Billing
// =============================================================================

export async function createPlanChangeRequest(formData: FormData) {
  const session = await requirePortalAction({
    capability: "billing.write",
    page: "settings",
  });
  const requestedPlan = normalizeString(formData.get("requestedPlan"));
  const message = normalizeString(formData.get("message"));

  if (!requestedPlan || !message) {
    redirect(getBillingRedirect("plan-request-invalid"));
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
      category: "billing",
      status: "open",
      subject: `Plan change request: ${requestedPlan}`,
      message,
      metadata: {
        requestType: "plan_change",
        requestedPlan,
        submittedBy: session.membership.email,
      },
    }),
  ]);

  if (insertResult.error) {
    redirect(getBillingRedirect("plan-request-error"));
  }

  const { sendPortalSupportEmail } = await import("@/lib/email");
  sendPortalSupportEmail({
    subject: `Plan change request: ${requestedPlan}`,
    category: "Billing — Plan change",
    message,
    client: {
      companyName: company?.name ?? session.membership.company_id,
      companyId: session.membership.company_id,
      submitterName: session.membership.full_name ?? "Unknown",
      submitterEmail: session.membership.email,
    },
  }).catch((err) => console.error("[email] Plan change email failed:", err));

  redirect(getBillingRedirect("plan-request-submitted"));
}
