"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "usage", label: "Usage" },
] as const;

export function BillingTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "usage" ? "usage" : "overview";

  return (
    <div className="inline-flex items-center rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-0.5">
      {TABS.map((tab) => {
        const next = new URLSearchParams();
        if (tab.value === "usage") next.set("tab", "usage");
        const href = next.toString()
          ? `${pathname}?${next.toString()}`
          : pathname;
        const isActive = activeTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "rounded-md px-3.5 py-1 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-white text-[#242529] shadow-sm"
                : "text-[rgba(0,0,0,0.45)] hover:text-[#242529]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
