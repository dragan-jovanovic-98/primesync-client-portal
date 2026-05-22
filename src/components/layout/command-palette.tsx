"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Phone,
  Receipt,
  Search,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePortalUser } from "@/components/providers/portal-provider";
import {
  canAccessPage,
  canAccessSettingsSection,
  type PortalPage,
  type PortalSettingsSection,
} from "@/lib/permissions";

type PageCommand = { href: string; label: string; page: PortalPage; icon: LucideIcon };
type SettingsCommand = {
  href: string;
  label: string;
  section: PortalSettingsSection;
  icon: LucideIcon;
};

// Referrals is intentionally omitted — it's a "Coming soon" stub, not navigable.
const PAGE_COMMANDS: PageCommand[] = [
  { href: "/dashboard", label: "Dashboard", page: "dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "Call Logs", page: "calls", icon: Phone },
  { href: "/billing", label: "Billing", page: "billing", icon: CreditCard },
  { href: "/settings", label: "Settings", page: "settings", icon: Settings },
  { href: "/support", label: "Help & Support", page: "support", icon: LifeBuoy },
  { href: "/notifications", label: "Notifications", page: "notifications", icon: Bell },
];

const SETTINGS_COMMANDS: SettingsCommand[] = [
  { href: "/settings/account", label: "Account", section: "account", icon: User },
  { href: "/settings/organization", label: "Organization", section: "organization", icon: Building2 },
  { href: "/settings/team", label: "Team", section: "team", icon: Users },
  { href: "/settings/locations", label: "Locations & Hours", section: "locations", icon: MapPin },
  { href: "/settings/billing", label: "Billing settings", section: "billing", icon: Receipt },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { role } = usePortalUser();

  const pages = PAGE_COMMANDS.filter((c) => canAccessPage(role, c.page));
  const settings = SETTINGS_COMMANDS.filter((c) =>
    canAccessSettingsSection(role, c.section),
  );

  // Close on Escape and lock body scroll while the palette is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[#eeeff1] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.07em] [&_[cmdk-group-heading]]:text-[rgba(0,0,0,0.4)]"
        >
          <div className="flex h-12 items-center gap-2.5 border-b border-[#eeeff1] px-4">
            <Search className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.4)]" />
            <Command.Input
              autoFocus
              placeholder="Search pages..."
              className="h-full flex-1 bg-transparent text-[14px] text-[#242529] outline-none placeholder:text-[rgba(0,0,0,0.35)]"
            />
            <kbd className="rounded border border-[#e5e5e5] bg-[#faf8f5] px-1.5 py-0.5 font-mono text-[11px] text-[rgba(0,0,0,0.4)]">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[340px] overflow-y-auto p-2">
            <Command.Empty className="px-2 py-8 text-center text-[13px] text-[rgba(0,0,0,0.4)]">
              No results found.
            </Command.Empty>

            {pages.length > 0 ? (
              <Command.Group heading="Pages">
                {pages.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Command.Item
                      key={c.href}
                      value={c.label}
                      onSelect={() => go(c.href)}
                      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-[14px] text-[#242529] data-[selected=true]:bg-[#fef5e7] data-[selected=true]:text-[#242529]"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#F19A1F]" />
                      {c.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {settings.length > 0 ? (
              <Command.Group heading="Settings">
                {settings.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Command.Item
                      key={c.href}
                      value={`Settings ${c.label}`}
                      onSelect={() => go(c.href)}
                      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-[14px] text-[#242529] data-[selected=true]:bg-[#fef5e7] data-[selected=true]:text-[#242529]"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#F19A1F]" />
                      {c.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
