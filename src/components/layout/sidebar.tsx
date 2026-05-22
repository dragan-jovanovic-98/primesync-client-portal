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
  Settings,
  Share2,
  Sparkles,
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

/**
 * Active nav item = white raised pill + filled-orange icon tile + dark label.
 * Inactive = bare orange line-icon + muted label, subtle hover lift.
 */
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
        "flex h-9 items-center gap-2.5 rounded-[10px] px-2 text-[14px] transition-colors",
        isActive
          ? "border border-[#eeeff1] bg-white font-semibold text-[#242529] shadow-sm"
          : "font-medium text-[rgba(0,0,0,0.7)] hover:bg-white/60 hover:text-[#242529]",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] transition-colors",
          isActive && "bg-[#F19A1F]",
        )}
      >
        <Icon
          className={cn(
            isActive ? "h-3.5 w-3.5 text-white" : "h-[18px] w-[18px] text-[#F19A1F]",
          )}
        />
      </span>
      <span className="truncate">{label}</span>
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
      className="group flex h-9 cursor-not-allowed items-center gap-2.5 rounded-[10px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.4)] select-none"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]">
        <Icon className="h-[18px] w-[18px] text-[#F19A1F]/45 transition-colors duration-150 group-hover:text-[#F19A1F]" />
      </span>
      <span className="truncate">{label}</span>
      <span className="ml-auto translate-x-1 rounded-full border border-[#F19A1F]/30 bg-[#fef5e7] px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#B25C0F] opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100">
        Coming soon
      </span>
    </div>
  );
}

/**
 * Orange promo card pinned to the sidebar footer. Replaces the prior
 * invite-team link + plan-status indicator. "Contact Us" → Help & Support.
 */
function SupportPromoCard() {
  return (
    <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-[#F4A93C] to-[#F19A1F] p-3.5 shadow-sm">
      {/* subtle depth wash */}
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
      <div className="relative">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="mt-2.5 text-[14px] font-semibold text-white">Need help?</p>
        <p className="mt-0.5 text-[12px] leading-snug text-white/85">
          Please check our FAQ
        </p>
        <Link
          href="/support"
          className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-white text-[13px] font-semibold text-[#242529] transition-colors hover:bg-white/90"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
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
        "hidden md:flex flex-col bg-[#faf8f5] border-r border-[#eeeff1] w-[275px] shrink-0 transition-[margin] duration-200 ease-in-out",
        collapsed && "-ml-[275px]",
      )}
    >
      {/* Workspace header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#eeeff1] px-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/brand/torqi-favicon-dark.svg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-[9px] shadow-sm"
            priority
          />
          <span className="truncate text-[17px] font-bold tracking-[0.01em] text-[#242529]">
            {BRAND.wordmark}
          </span>
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#eeeff1] bg-white text-[rgba(0,0,0,0.4)] shadow-sm transition-colors hover:text-[#242529]"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Core navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 pt-3">
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
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[rgba(0,0,0,0.4)]">
              Resources
            </span>
          </div>
          <div className="space-y-1">
            {showReferrals && <DisabledNavLink label="Referrals" icon={Gift} />}
            <NavLink href="/support" label="Help & Support" icon={LifeBuoy} />
          </div>
        </div>
      </nav>

      {/* Footer promo */}
      <div className="shrink-0 p-2.5">
        <SupportPromoCard />
      </div>
    </aside>
  );
}
