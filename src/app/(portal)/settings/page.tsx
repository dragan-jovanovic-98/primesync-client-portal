"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePortalUser } from "@/components/providers/portal-provider";
import { getSettingsTabs } from "@/lib/permissions";

const SETTINGS_GROUPS = [
  {
    group: "Personal",
    items: [{ label: "Account", href: "/settings/account" }],
  },
  {
    group: "Workspace",
    items: [
      { label: "Organization", href: "/settings/organization" },
      { label: "Team", href: "/settings/team" },
      { label: "Locations", href: "/settings/locations" },
    ],
  },
  {
    group: "Billing",
    items: [{ label: "Billing", href: "/settings/billing" }],
  },
];

export default function SettingsPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { role } = usePortalUser();

  const groups = useMemo(() => {
    const allowedHrefs = new Set(
      getSettingsTabs(
        role,
        SETTINGS_GROUPS.flatMap((g) => g.items),
      ).map((t) => t.href),
    );
    return SETTINGS_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedHrefs.has(item.href)),
    })).filter((group) => group.items.length > 0);
  }, [role]);

  useEffect(() => {
    // Only redirect once we've definitively detected a non-mobile viewport.
    // While `isMobile` is null (initial / SSR), do nothing so the user doesn't
    // get bounced to /settings/account when they actually wanted the index.
    if (isMobile === false) {
      router.replace("/settings/account");
    }
  }, [isMobile, router]);

  if (isMobile !== true) {
    // null = still detecting (don't flash anything), false = redirect in flight
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#242529]">
          Settings
        </h1>
        <p className="mt-0.5 text-[14px] text-[rgba(0,0,0,0.7)]">
          Manage your account, workspace, and billing.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.group}>
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {group.group}
          </p>
          <div className="overflow-hidden rounded-lg border border-[#eeeff1] bg-white">
            <div className="divide-y divide-[#eeeff1]">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between px-4 py-3.5 transition-colors active:bg-[#fbfbfb]"
                >
                  <span className="text-[14px] text-[#242529]">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
