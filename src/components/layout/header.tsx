"use client";

import Link from "next/link";
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
  Search,
  Settings,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalUser } from "@/components/providers/portal-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { createClient } from "@/lib/supabase/client";
import type { PortalNotification } from "@/app/(portal)/notifications/actions";

const pageConfig: Record<
  string,
  { title: string; icon: typeof LayoutDashboard }
> = {
  "/dashboard": { title: "Dashboard", icon: LayoutDashboard },
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const config = getPageConfig(pathname);
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

  // ⌘K / Ctrl+K toggles the command palette from anywhere in the portal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#eeeff1] bg-[#faf8f5] px-4">
      <div className="flex min-w-0 items-center gap-2">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529]"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        )}
        <MobileNav />
        {/* Breadcrumb. "Pages /" prefix is desktop-only; on mobile just the title shows. */}
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[14px]">
          <span className="hidden text-[rgba(0,0,0,0.4)] sm:inline">Pages</span>
          <span className="hidden text-[rgba(0,0,0,0.25)] sm:inline">/</span>
          <span className="truncate font-medium text-[#242529]">
            {config.title}
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Search pill — opens the ⌘K command palette. */}
        <button
          type="button"
          aria-label="Search"
          onClick={() => setCmdOpen(true)}
          className="hidden h-9 w-[240px] items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-3.5 text-[13px] text-[rgba(0,0,0,0.4)] transition-colors hover:border-[#d4d4d4] md:flex lg:w-[280px]"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Type here...</span>
          <kbd className="rounded border border-[#e5e5e5] bg-[#faf8f5] px-1.5 py-0.5 font-mono text-[11px] text-[rgba(0,0,0,0.4)]">
            ⌘K
          </kbd>
        </button>
        {/* Mobile: search collapses to an icon button (same palette). */}
        <button
          type="button"
          aria-label="Search"
          onClick={() => setCmdOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[rgba(0,0,0,0.7)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529] md:hidden"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Settings shortcut — hidden on mobile (Settings is in the nav drawer)
            to keep the phone top bar from crowding. */}
        <Link
          href="/settings"
          aria-label="Settings"
          className="hidden h-9 w-9 items-center justify-center rounded-md text-[rgba(0,0,0,0.7)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529] sm:flex"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>

        {role === "admin" ? (
          <NotificationBell
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
        ) : null}

        <div className="relative flex items-center" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center rounded-lg transition-opacity hover:opacity-80 focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F19A1F] text-[12px] font-semibold text-white">
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

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </header>
  );
}
