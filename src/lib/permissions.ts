export type PortalRole = "admin" | "staff";

export type PortalPage =
  | "dashboard"
  | "calls"
  | "billing"
  | "settings"
  | "support"
  | "referrals"
  | "notifications";

export type PortalSettingsSection =
  | "account"
  | "organization"
  | "team"
  | "locations"
  | "billing";

// PortalCapability is the unit of action-level authorization. Pages stay
// coarse for route guards; capabilities are fine-grained for server-action
// enforcement. Adding a third role in the future is a single new key in the
// ROLE_CAPABILITIES map below — no other code needs to change.
export type PortalCapability =
  // Calls
  | "calls.read"
  | "calls.write_review"

  // Billing
  | "billing.read"
  | "billing.write"
  | "billing.invoices.read"

  // Settings: account (self-only edits)
  | "settings.account.read"
  | "settings.account.write"

  // Settings: organization (company-level edits)
  | "settings.organization.read"
  | "settings.organization.write"

  // Settings: locations (per-location editing of hours, closures, notification emails)
  | "settings.locations.read"
  | "settings.locations.write_hours"
  | "settings.locations.write_closures"
  | "settings.locations.write_notification_emails"

  // Settings: report (post-v1 stub, gated now so the page can ship later without re-checks)
  | "settings.report.read"
  | "settings.report.write"

  // Settings: security (post-v1 stub)
  | "settings.security.read"
  | "settings.security.write"

  // Team / user management
  | "team.read"
  | "team.invite"
  | "team.promote"
  | "team.demote"
  | "team.disable"
  | "team.reenable"

  // Notifications (in-app feed)
  | "notifications.read"
  | "notifications.mark_read"

  // Support
  | "support.read"
  | "support.create";

const ROLE_PAGES: Record<PortalRole, PortalPage[]> = {
  admin: [
    "dashboard",
    "calls",
    "billing",
    "settings",
    "support",
    "referrals",
    "notifications",
  ],
  staff: ["dashboard", "calls", "settings", "support", "referrals"],
};

const ROLE_SETTINGS_SECTIONS: Record<PortalRole, PortalSettingsSection[]> = {
  admin: ["account", "organization", "team", "locations", "billing"],
  staff: ["account", "locations"],
};

const ROLE_CAPABILITIES: Record<PortalRole, PortalCapability[]> = {
  admin: [
    "calls.read",
    "calls.write_review",
    "billing.read",
    "billing.write",
    "billing.invoices.read",
    "settings.account.read",
    "settings.account.write",
    "settings.organization.read",
    "settings.organization.write",
    "settings.locations.read",
    "settings.locations.write_hours",
    "settings.locations.write_closures",
    "settings.locations.write_notification_emails",
    "settings.report.read",
    "settings.report.write",
    "settings.security.read",
    "settings.security.write",
    "team.read",
    "team.invite",
    "team.promote",
    "team.demote",
    "team.disable",
    "team.reenable",
    "notifications.read",
    "notifications.mark_read",
    "support.read",
    "support.create",
  ],
  staff: [
    "calls.read",
    "calls.write_review",
    "settings.account.read",
    "settings.account.write",
    "settings.locations.read",
    "settings.locations.write_hours",
    "settings.locations.write_closures",
    // staff is intentionally NOT given write_notification_emails,
    // notifications.read, or notifications.mark_read — the in-app
    // notification feed surfaces billing events only, and staff cannot
    // see billing information.
    "support.read",
    "support.create",
  ],
};

export const PORTAL_NAV_ITEMS: Array<{
  href: string;
  label: string;
  page: PortalPage;
}> = [
  { href: "/dashboard", label: "Dashboard", page: "dashboard" },
  { href: "/calls", label: "Call Logs", page: "calls" },
  { href: "/billing", label: "Billing", page: "billing" },
  { href: "/settings", label: "Settings", page: "settings" },
  { href: "/support", label: "Help & Support", page: "support" },
  { href: "/referrals", label: "Referrals", page: "referrals" },
];

export const PORTAL_SECONDARY_NAV_ITEMS: Array<{
  href: string;
  label: string;
  page: PortalPage;
}> = [{ href: "/notifications", label: "Notifications", page: "notifications" }];

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function getPortalRole(role: PortalRole, isOwner: boolean): PortalRole {
  return isOwner ? "admin" : role;
}

export function canAccessPage(role: PortalRole, page: PortalPage): boolean {
  return ROLE_PAGES[role].includes(page);
}

export function canAccessSettingsSection(
  role: PortalRole,
  section: string,
): boolean {
  return ROLE_SETTINGS_SECTIONS[role].includes(section as PortalSettingsSection);
}

export function getSettingsTabs<T extends { href: string }>(
  role: PortalRole,
  tabs: T[],
): T[] {
  const allowed = ROLE_SETTINGS_SECTIONS[role];
  return tabs.filter((tab) => {
    const section = tab.href.replace("/settings/", "");
    return allowed.includes(section as PortalSettingsSection);
  });
}

export function hasCapability(
  role: PortalRole,
  capability: PortalCapability,
): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function requireCapability(
  role: PortalRole,
  capability: PortalCapability,
): void {
  if (!hasCapability(role, capability)) {
    throw new ForbiddenError(`role ${role} lacks capability ${capability}`);
  }
}
