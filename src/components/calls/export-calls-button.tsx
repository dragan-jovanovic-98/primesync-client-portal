"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function ExportCallsButton() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = query
    ? `/api/portal/calls/export.csv?${query}`
    : "/api/portal/calls/export.csv";

  return (
    <a
      href={href}
      download
      className="hidden h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-3 text-[13px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa] md:inline-flex"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </a>
  );
}
