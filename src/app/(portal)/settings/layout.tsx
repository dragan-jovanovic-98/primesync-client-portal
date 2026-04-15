"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePortalUser } from "@/components/providers/portal-provider";
import { getSettingsTabs } from "@/lib/permissions";

const settingsTabs = [
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

const allTabs = settingsTabs.flatMap((g) => g.items);

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { role } = usePortalUser();

  const filteredTabs = useMemo(
    () => getSettingsTabs(role, allTabs),
    [role],
  );

  const filteredGroups = useMemo(() => {
    const allowedHrefs = new Set(filteredTabs.map((t) => t.href));
    return settingsTabs
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => allowedHrefs.has(item.href)),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredTabs]);

  return (
    <div className="flex min-w-0 gap-10">
      {/* Desktop sidebar navigation */}
      <nav className="hidden w-[200px] shrink-0 md:block">
        <div className="sticky top-0 space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.group}>
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      pathname === tab.href
                        ? "bg-zinc-100 font-medium text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile tab bar */}
      <nav className="fixed top-0 right-0 left-0 z-20 overflow-x-auto border-b border-zinc-200 bg-white p-1 no-scrollbar md:hidden">
        <div className="flex gap-1">
          {filteredTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                pathname === tab.href
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
