import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatBillingCurrency,
  type BillingUsageCallRow,
  type BillingUsageResult,
} from "@/lib/billing";
import { getOutcomeLabel } from "@/lib/call-outcomes";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatCost(cost: number | null) {
  if (cost === null || cost === undefined) return null;
  if (cost === 0) return null;
  return formatBillingCurrency(cost);
}

interface UsageTableProps {
  result: BillingUsageResult;
  pathname: string;
  searchParamsString: string;
}

export function UsageTable({
  result,
  pathname,
  searchParamsString,
}: UsageTableProps) {
  const totalPages = Math.max(1, Math.ceil(result.total / result.perPage));
  const start = result.total === 0 ? 0 : (result.page - 1) * result.perPage + 1;
  const end = Math.min(result.page * result.perPage, result.total);

  function pageHref(pageNum: number) {
    const next = new URLSearchParams(searchParamsString);
    next.set("tab", "usage");
    if (pageNum <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(pageNum));
    }
    const q = next.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  if (result.rows.length === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="px-5 py-16 text-center">
          <p className="text-[14px] font-medium text-[#242529]">
            No usage in this time range
          </p>
          <p className="mt-1 text-[13px] text-zinc-500">
            Try expanding the date range or clearing filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div
        className="grid h-10 items-center gap-x-6 border-b border-[#eeeff1] px-5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
        style={{
          gridTemplateColumns:
            "160px 90px 180px minmax(0,1fr) 180px 100px",
        }}
      >
        <div>Call time</div>
        <div className="text-right tabular-nums">Duration</div>
        <div>Agent</div>
        <div>Location</div>
        <div>Outcome</div>
        <div className="text-right tabular-nums">Cost</div>
      </div>

      <div className="divide-y divide-[#eeeff1]">
        {result.rows.map((row: BillingUsageCallRow) => {
          const cost = formatCost(row.clientCost);
          return (
            <div
              key={row.callId}
              className="grid h-[46px] items-center gap-x-6 px-5 text-[13px] text-[#242529] transition-colors hover:bg-[#fbfbfb]"
              style={{
                gridTemplateColumns:
                  "160px 90px 180px minmax(0,1fr) 180px 100px",
              }}
            >
              <div className="text-zinc-600">
                {row.callDate
                  ? format(parseISO(row.callDate), "MMM d, h:mm a")
                  : "—"}
              </div>
              <div className="text-right tabular-nums text-zinc-600">
                {formatDuration(row.durationSeconds)}
              </div>
              <div className="truncate">{row.agentName ?? "—"}</div>
              <div className="truncate text-zinc-600">
                {row.locationName ?? "—"}
              </div>
              <div className="truncate text-zinc-600">
                {row.outcome ? getOutcomeLabel(row.outcome) : "—"}
              </div>
              <div
                className="text-right tabular-nums font-medium"
                title={
                  cost === null
                    ? "Included in subscription"
                    : undefined
                }
              >
                {cost ?? <span className="text-zinc-400">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-[#eeeff1] px-5 py-3">
          <span className="text-[12px] text-zinc-500">
            Showing {start}–{end} of {result.total}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={result.page > 1 ? pageHref(result.page - 1) : "#"}
              aria-disabled={result.page <= 1}
              className={cn(
                "flex h-8 items-center gap-1 rounded-lg border border-[#e5e5e5] px-2.5 text-[12.5px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa]",
                result.page <= 1 && "pointer-events-none opacity-40",
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Link>
            <Link
              href={
                result.page < totalPages ? pageHref(result.page + 1) : "#"
              }
              aria-disabled={result.page >= totalPages}
              className={cn(
                "flex h-8 items-center gap-1 rounded-lg border border-[#e5e5e5] px-2.5 text-[12.5px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa]",
                result.page >= totalPages && "pointer-events-none opacity-40",
              )}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
