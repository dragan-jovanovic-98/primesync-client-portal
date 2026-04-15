"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Phone,
  Settings,
  Share2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalUser } from "@/components/providers/portal-provider";
import { PORTAL_NAV_ITEMS } from "@/lib/permissions";

const icons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  calls: Phone,
  billing: CreditCard,
  settings: Settings,
  support: LifeBuoy,
  referrals: Share2,
};

export function MobileNav() {
  const pathname = usePathname();
  const { role } = usePortalUser();
  const [open, setOpen] = useState(false);

  const navItems = PORTAL_NAV_ITEMS.filter((item) =>
    role === "admin" ? true : item.page !== "billing",
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[rgba(0,0,0,0.55)] transition-colors hover:bg-[#eeeff1] md:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#fbfbfb] shadow-xl transition-transform duration-200 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-[#eeeff1] px-4">
          <span className="text-[14px] font-semibold text-[#242529] tracking-[-0.14px]">
            Primesync
          </span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="space-y-px p-2">
          {navItems.map((item) => {
            const Icon = icons[item.page] ?? LayoutDashboard;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors",
                  isActive
                    ? "bg-[#eeeff1] text-[#242529]"
                    : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-[#242529]" : "text-[rgba(0,0,0,0.35)]",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
