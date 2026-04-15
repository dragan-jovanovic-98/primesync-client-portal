"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  PanelLeftClose,
  Phone,
  Settings,
  Share2,
  UserPlus,
} from "lucide-react";
import { signOut } from "@/app/(portal)/actions";
import { PORTAL_NAV_ITEMS, type PortalRole } from "@/lib/permissions";

const icons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  calls: Phone,
  billing: CreditCard,
  settings: Settings,
  support: Headphones,
  referrals: Share2,
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calls": "Call Logs",
  "/billing": "Billing",
  "/settings": "Settings",
  "/support": "Help & Support",
  "/referrals": "Referrals",
};

type PortalShellProps = {
  children: React.ReactNode;
  companyId: string;
  email: string;
  fullName: string | null;
  role: PortalRole;
};

export function PortalShell({
  children,
  companyId,
  email,
  fullName,
  role,
}: PortalShellProps) {
  const pathname = usePathname();
  const navItems = PORTAL_NAV_ITEMS.filter((item) =>
    role === "admin" ? true : item.page !== "billing",
  );

  const pageTitle =
    Object.entries(pageTitles).find(
      ([path]) => pathname === path || pathname.startsWith(`${path}/`),
    )?.[1] ?? "Portal";

  const pageIcon = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`),
  )?.[0];
  const PageIcon = pageIcon ? icons[pageIcon.slice(1)] ?? LayoutDashboard : LayoutDashboard;

  const initials = (fullName || email).slice(0, 2).toUpperCase();

  return (
    <div className="flex h-dvh">
      {/* Sidebar */}
      <aside className="hidden w-[275px] shrink-0 flex-col border-r border-[#eeeff1] bg-[#fbfbfb] md:flex">
        {/* Sidebar header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#eeeff1] px-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#242529] text-[10px] font-bold text-white">
              P
            </div>
            <span className="truncate text-[14px] font-semibold text-[#242529]">
              Primesync
            </span>
          </Link>
          <button className="flex h-6 w-6 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529]">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Notifications placeholder */}
        <div className="px-2 pt-2.5 pb-1.5">
          <div className="flex h-7 w-full items-center gap-[6px] rounded-lg bg-white px-2 text-[14px] font-medium text-[rgba(0,0,0,0.55)]">
            <Bell className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Notifications</span>
            <span className="text-[11px] text-[rgba(0,0,0,0.35)]">Soon</span>
          </div>
        </div>

        {/* Core navigation */}
        <nav className="flex-1 overflow-y-auto px-2">
          <div className="space-y-px">
            {navItems
              .filter((item) => item.page !== "support" && item.page !== "referrals")
              .map((item) => {
                const Icon = icons[item.page] ?? LayoutDashboard;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors ${
                      isActive
                        ? "bg-[#eeeff1] text-[#242529]"
                        : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-[#242529]" : "text-[rgba(0,0,0,0.35)]"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>

          {/* Resources section */}
          <div className="mt-5">
            <div className="px-2 pb-1.5">
              <span className="text-[12px] font-medium text-[rgba(0,0,0,0.55)]">
                Resources
              </span>
            </div>
            <div className="space-y-px">
              {navItems
                .filter((item) => item.page === "referrals")
                .map((item) => {
                  const Icon = icons[item.page] ?? Share2;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors ${
                        isActive
                          ? "bg-[#eeeff1] text-[#242529]"
                          : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? "text-[#242529]" : "text-[rgba(0,0,0,0.35)]"
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              <Link
                href="/support"
                className={`flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors ${
                  pathname === "/support" || pathname.startsWith("/support/")
                    ? "bg-[#eeeff1] text-[#242529]"
                    : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]"
                }`}
              >
                <LifeBuoy
                  className={`h-4 w-4 shrink-0 ${
                    pathname === "/support" || pathname.startsWith("/support/")
                      ? "text-[#242529]"
                      : "text-[rgba(0,0,0,0.35)]"
                  }`}
                />
                <span>Help &amp; Support</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 space-y-1 border-t border-[#eeeff1] px-2 py-1.5">
          {role === "admin" ? (
            <Link
              href="/settings?section=users"
              className="flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.55)] transition-colors hover:bg-[#eeeff1]/60 hover:text-[#242529]"
            >
              <UserPlus className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
              <span>Invite team members</span>
            </Link>
          ) : null}
          <div className="flex items-center justify-between rounded-[9px] px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[#242529]">
                {fullName || email}
              </p>
              <p className="truncate text-[12px] text-[rgba(0,0,0,0.45)]">{role}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-7 items-center gap-1 rounded-[9px] px-2 text-[13px] text-[rgba(0,0,0,0.55)] transition-colors hover:bg-[#eeeff1]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#eeeff1] bg-white px-4">
          <div className="flex items-center gap-1.5">
            <PageIcon className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
            <span className="text-[14px] font-medium text-[#242529]">
              {pageTitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-[13px] font-medium text-[#242529]">
                {fullName || email}
              </p>
              <p className="text-[11px] text-[rgba(0,0,0,0.45)]">{companyId}</p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#242529] text-[10px] font-medium text-white">
              {initials}
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-white px-4 py-6 sm:px-8">
          <div className="mx-auto min-w-0 max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
