"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  PanelLeftClose,
  Phone,
  Search,
  Settings,
  Share2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { usePortalUser } from "@/components/providers/portal-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { PORTAL_NAV_ITEMS } from "@/lib/permissions";

const icons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  calls: Phone,
  billing: CreditCard,
  settings: Settings,
  support: LifeBuoy,
  referrals: Share2,
};

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors",
        isActive
          ? "bg-[#eeeff1] text-[#242529]"
          : "text-[rgba(0,0,0,0.7)] hover:bg-[#eeeff1]/60 hover:text-[#242529]",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-[#242529]" : "text-[rgba(0,0,0,0.35)]",
        )}
      />
      <span>{label}</span>
    </Link>
  );
}

function DisabledNavLink({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof LayoutDashboard;
}) {
  return (
    <div
      aria-disabled="true"
      className="group flex h-7 cursor-not-allowed items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.4)] select-none"
    >
      <Icon className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.3)] transition-colors duration-150 group-hover:text-[#F19A1F]" />
      <span>{label}</span>
      <span className="ml-auto translate-x-1 rounded-full border border-[#F19A1F]/30 bg-[#fef5e7] px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#B25C0F] opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100">
        Coming soon
      </span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const { role } = usePortalUser();

  const navItems = PORTAL_NAV_ITEMS.filter((item) =>
    role === "admin" ? true : item.page !== "billing",
  );

  const coreItems = navItems.filter(
    (item) => item.page !== "support" && item.page !== "referrals",
  );
  const showReferrals = navItems.some((item) => item.page === "referrals");

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-[#fbfbfb] border-r border-[#eeeff1] w-[275px] shrink-0 transition-[margin] duration-200 ease-in-out",
        collapsed && "-ml-[275px]",
      )}
    >
      {/* Workspace header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#eeeff1] px-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <Image
            src="/brand/torqi-favicon-dark.svg"
            alt=""
            width={26}
            height={26}
            className="h-[26px] w-[26px] shrink-0 rounded-md"
            priority
          />
          <span className="truncate text-[16px] font-bold tracking-[0.025em] text-[#242529]">
            {BRAND.wordmark}
          </span>
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529]"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-2 pt-2.5 pb-1.5">
        <button className="flex h-7 w-full items-center gap-[6px] rounded-lg border border-[#e5e5e5] bg-white px-2 text-[13px] font-normal text-[rgba(0,0,0,0.4)] transition-colors hover:bg-[#eeeff1]/60">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Quick actions</span>
          <kbd className="text-[11px] text-[rgba(0,0,0,0.3)]">⌘K</kbd>
        </button>
      </div>

      {/* Core navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          {coreItems.map((item) => {
            const Icon = icons[item.page] ?? LayoutDashboard;
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={Icon}
              />
            );
          })}
        </div>

        {/* Resources section */}
        <div className="mt-5">
          <div className="px-2 pb-1.5">
            <span className="text-[12px] font-medium text-[rgba(0,0,0,0.7)] tracking-[-0.12px]">
              Resources
            </span>
          </div>
          <div className="space-y-1">
            {showReferrals && <DisabledNavLink label="Referrals" icon={Gift} />}
            <NavLink href="/support" label="Help & Support" icon={LifeBuoy} />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-1 border-t border-[#eeeff1] px-2 py-1.5">
        {role === "admin" && (
          <Link
            href="/settings/team"
            className="flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.7)] transition-colors hover:bg-[#eeeff1]/60 hover:text-[#242529]"
          >
            <UserPlus className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
            <span>Invite team members</span>
          </Link>
        )}
        <div className="flex items-center gap-[6px] rounded-[9px] px-2 py-1.5">
          <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate text-[13px] font-medium text-[rgba(0,0,0,0.7)]">
            Active plan
          </span>
        </div>
      </div>
    </aside>
  );
}
