"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Mobile back-link to /settings index */}
        {pathname !== "/settings" ? (
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-zinc-500 transition-colors hover:text-[#242529] md:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
            Settings
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}
