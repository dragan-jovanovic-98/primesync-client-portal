"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  PanelLeft,
  Phone,
  Settings,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalUser } from "@/components/providers/portal-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { createClient } from "@/lib/supabase/client";
import type { PortalNotification } from "@/app/(portal)/notifications/actions";

const pageConfig: Record<
  string,
  { title: string; icon: typeof LayoutDashboard }
> = {
  "/dashboard": { title: "Home", icon: LayoutDashboard },
  "/calls": { title: "Call Logs", icon: Phone },
  "/billing": { title: "Billing", icon: CreditCard },
  "/settings": { title: "Settings", icon: Settings },
  "/support": { title: "Help & Support", icon: LifeBuoy },
  "/referrals": { title: "Referrals", icon: Share2 },
  "/notifications": { title: "Notifications", icon: Bell },
};

function getPageConfig(pathname: string) {
  for (const [path, config] of Object.entries(pageConfig)) {
    if (pathname === path || pathname.startsWith(path + "/")) return config;
  }
  return { title: "", icon: LayoutDashboard };
}

interface HeaderProps {
  initialNotifications: PortalNotification[];
  initialUnreadCount: number;
}

export function Header({
  initialNotifications,
  initialUnreadCount,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebar();
  const { email, fullName, role } = usePortalUser();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const config = getPageConfig(pathname);
  const PageIcon = config.icon;
  const initials = (fullName || email).slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#eeeff1] bg-white px-4">
      <div className="flex items-center gap-2">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529]"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        )}
        <MobileNav />
        <div className="flex items-center gap-2">
          <PageIcon className="h-[18px] w-[18px] text-[var(--torqi-navy)]" />
          <span className="text-[15px] font-semibold text-[#242529]">
            {config.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {role === "admin" ? (
          <NotificationBell
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
        ) : null}

        <div className="relative flex items-center" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center rounded-full transition-opacity hover:opacity-80 focus:outline-none"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--torqi-navy)] text-[11px] font-medium text-white">
              {initials}
            </div>
          </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-[#eeeff1] bg-white py-1 shadow-lg z-50">
            <div className="px-3 py-2">
              <p className="text-[14px] font-medium text-[#242529]">
                {fullName || email}
              </p>
              <p className="text-[13px] text-[rgba(0,0,0,0.7)]">{email}</p>
            </div>
            <div className="mx-2 h-px bg-[#eeeff1]" />
            <button
              onClick={() => {
                setMenuOpen(false);
                router.push("/settings/account");
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[14px] text-[#242529] transition-colors hover:bg-[#f8f9fa]"
            >
              <Settings className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
              Account settings
            </button>
            <div className="mx-2 h-px bg-[#eeeff1]" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[14px] text-[#242529] transition-colors hover:bg-[#f8f9fa]"
            >
              <LogOut className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
              Sign out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
