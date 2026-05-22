"use client";

import Link from "next/link";
import Image from "next/image";
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
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-[rgba(0,0,0,0.7)] transition-colors hover:bg-[#eeeff1] md:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#faf8f5] shadow-xl transition-transform duration-200 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-[#eeeff1] px-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/torqi-favicon-dark.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-[9px] shadow-sm"
            />
            <span className="text-[17px] font-bold tracking-[0.01em] text-[#242529]">
              {BRAND.wordmark}
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#eeeff1] bg-white text-[rgba(0,0,0,0.4)] shadow-sm transition-colors hover:text-[#242529]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {navItems.map((item) => {
            const Icon = icons[item.page] ?? LayoutDashboard;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            if (item.page === "referrals") {
              return (
                <div
                  key={item.href}
                  aria-disabled="true"
                  className="flex h-9 cursor-not-allowed items-center gap-2.5 rounded-[10px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.4)] select-none"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]">
                    <Icon className="h-[18px] w-[18px] text-[#F19A1F]/45" />
                  </span>
                  <span>{item.label}</span>
                  <span className="ml-auto rounded-full border border-[#F19A1F]/30 bg-[#fef5e7] px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#B25C0F]">
                    Coming soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-[10px] px-2 text-[14px] transition-colors",
                  isActive
                    ? "border border-[#eeeff1] bg-white font-semibold text-[#242529] shadow-sm"
                    : "font-medium text-[rgba(0,0,0,0.7)] hover:bg-white/60 hover:text-[#242529]",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]",
                    isActive && "bg-[#F19A1F]",
                  )}
                >
                  <Icon
                    className={cn(
                      isActive
                        ? "h-3.5 w-3.5 text-white"
                        : "h-[18px] w-[18px] text-[#F19A1F]",
                    )}
                  />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer promo */}
        <div className="shrink-0 p-2.5">
          <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-[#F4A93C] to-[#F19A1F] p-3.5 shadow-sm">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
            <div className="relative">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-[14px] font-semibold text-white">
                Need help?
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-white/85">
                Please check our FAQ
              </p>
              <Link
                href="/support"
                onClick={() => setOpen(false)}
                className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-white text-[13px] font-semibold text-[#242529] transition-colors hover:bg-white/90"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
