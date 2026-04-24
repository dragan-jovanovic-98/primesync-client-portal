"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCallDuration,
  formatPhoneNumber,
  getOutcomeBadge,
  normalizeSentiment,
  SENTIMENT_STYLES,
  type CallLog,
} from "@/lib/calls";

interface CallsTableProps {
  calls: Array<CallLog & { isBusinessHours: boolean | null }>;
  total: number;
  page: number;
  perPage: number;
}

const cols = "150px 115px 190px 160px 110px 120px 1fr";
const emptyDash = "text-[14px] text-[rgba(0,0,0,0.25)]";
const cellBase = "flex items-center truncate border-r border-[#eeeff1] px-3";
const cellLast = "flex items-center truncate px-3";
const headerText =
  "text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)]";

function outcomeBadgeStyles(tier: "high" | "medium" | "low") {
  if (tier === "high") return "bg-[#F19A1F] text-white";
  if (tier === "medium") return "bg-[#0F1841] text-white";
  return "bg-zinc-100 text-zinc-500";
}

export function CallsTable({ calls, total, page, perPage }: CallsTableProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function toggleSort(column: string) {
    const params = new URLSearchParams(searchParams.toString());
    const currentSort = params.get("sort");
    const currentOrder = params.get("order");

    if (currentSort === column && currentOrder !== "asc") {
      params.set("order", "asc");
    } else {
      params.set("sort", column);
      params.delete("order");
    }

    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", nextPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  }

  if (calls.length === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white p-8 text-center">
        <p className="text-[14px] text-[rgba(0,0,0,0.55)]">No calls match your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[#eeeff1] bg-white">
        <div className="grid border-b border-[#eeeff1]" style={{ gridTemplateColumns: cols }}>
          <div className={cn(cellBase, headerText, "h-10")}>
            <button
              onClick={() => toggleSort("date")}
              className="inline-flex items-center gap-1.5 uppercase"
            >
              Date / Time <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className={cn(cellBase, headerText, "h-10")}>
            <button
              onClick={() => toggleSort("duration")}
              className="inline-flex items-center gap-1.5 uppercase"
            >
              Duration <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className={cn(cellBase, headerText, "h-10")}>Caller</div>
          <div className={cn(cellBase, headerText, "h-10")}>Outcome</div>
          <div className={cn(cellBase, headerText, "h-10")}>Agent</div>
          <div className={cn(cellBase, headerText, "h-10")}>
            <button
              onClick={() => toggleSort("sentiment")}
              className="inline-flex items-center gap-1.5 uppercase"
            >
              Sentiment <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className={cn(cellLast, headerText, "h-10")}>Summary</div>
        </div>

        {calls.map((call, index) => {
          const badge = getOutcomeBadge(call.call_outcome);
          const sentiment = normalizeSentiment(call.user_sentiment);
          const sentimentStyle = sentiment ? SENTIMENT_STYLES[sentiment] : null;

          return (
            <div
              key={call.call_id}
              className={cn(
                "group grid cursor-pointer transition-colors hover:bg-[#f8f9fa]",
                index < calls.length - 1 && "border-b border-[#eeeff1]",
              )}
              style={{ gridTemplateColumns: cols, height: 36 }}
              onClick={() => router.push(`/calls/${encodeURIComponent(call.call_id)}`)}
            >
              <div className={cn(cellBase, "text-[14px] font-medium text-[#242529]")}>
                {call.call_date ? format(new Date(call.call_date), "MMM d, h:mm a") : "—"}
              </div>

              <div className={cn(cellBase, "tabular-nums text-[14px] text-[#242529]")}>
                {formatCallDuration(call.call_duration_s)}
              </div>

              <div className={cn(cellBase, "gap-2 text-[14px] text-[#242529]")}>
                {call.call_direction === "inbound" ? (
                  <PhoneIncoming className="h-[14px] w-[14px] shrink-0 text-emerald-600" />
                ) : (
                  <PhoneOutgoing className="h-[14px] w-[14px] shrink-0 text-[rgba(0,0,0,0.3)]" />
                )}
                <span className="truncate">{formatPhoneNumber(call.phone_number)}</span>
              </div>

              <div className={cellBase}>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium",
                    outcomeBadgeStyles(badge.tier),
                  )}
                >
                  {badge.label}
                </span>
              </div>

              <div className={cn(cellBase, "text-[14px] text-[#242529]")}>
                <span className="truncate">
                  {call.agent_name || <span className={emptyDash}>—</span>}
                </span>
              </div>

              <div className={cellBase}>
                {sentimentStyle ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium",
                      sentimentStyle.pill,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", sentimentStyle.dot)} />
                    {sentimentStyle.label}
                  </span>
                ) : (
                  <span className={emptyDash}>—</span>
                )}
              </div>

              <div
                className={cn(
                  cellLast,
                  "justify-between text-[14px] text-[rgba(0,0,0,0.5)]",
                )}
              >
                <span className="truncate">{call.summary || "—"}</span>
                <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[rgba(0,0,0,0.25)] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[rgba(0,0,0,0.45)]">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <span className="tabular-nums text-[13px] font-medium text-[rgba(0,0,0,0.45)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
