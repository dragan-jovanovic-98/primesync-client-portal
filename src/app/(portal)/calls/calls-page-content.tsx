"use client";

import type { CallLog } from "@/lib/calls";
import { CallFilters } from "@/components/calls/call-filters";
import { CallSearch } from "@/components/calls/call-search";
import { CallsTable } from "@/components/calls/calls-table";
import { ExportCallsButton } from "@/components/calls/export-calls-button";

interface CallsPageContentProps {
  calls: Array<CallLog & { isBusinessHours: boolean | null }>;
  total: number;
  page: number;
  perPage: number;
  agents: Array<{ value: string; label: string }>;
  outcomes: Array<{ value: string; label: string }>;
}

export function CallsPageContent({
  calls,
  total,
  page,
  perPage,
  agents,
  outcomes,
}: CallsPageContentProps) {
  return (
    <div className="space-y-4">
      {/* Mobile: search full-width on top, filters row below (export hidden via own md:flex) */}
      <div className="space-y-3 md:hidden">
        <CallSearch />
        <div>
          <CallFilters agents={agents} outcomes={outcomes} />
        </div>
      </div>

      {/* Desktop: existing inline single row */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-3">
        <CallFilters agents={agents} outcomes={outcomes} />
        <div className="flex items-center gap-2">
          <CallSearch />
          <ExportCallsButton />
        </div>
      </div>

      <CallsTable calls={calls} total={total} page={page} perPage={perPage} />
    </div>
  );
}
