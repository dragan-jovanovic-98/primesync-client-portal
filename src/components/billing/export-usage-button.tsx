"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function ExportUsageButton() {
  const searchParams = useSearchParams();
  const forwarded = new URLSearchParams();
  for (const key of ["from", "to", "agent", "location"]) {
    const value = searchParams.get(key);
    if (value) forwarded.set(key, value);
  }
  const query = forwarded.toString();
  const href = query
    ? `/api/portal/usage/export.csv?${query}`
    : "/api/portal/usage/export.csv";

  return (
    <a
      href={href}
      download
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-3 text-[13px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa]"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </a>
  );
}
