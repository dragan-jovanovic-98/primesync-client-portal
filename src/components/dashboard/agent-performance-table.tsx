import type { AgentPerformanceRow } from "@/app/(portal)/dashboard/actions";

function formatAvgDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "—";
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatExpectedOrders(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

interface AgentPerformanceTableProps {
  rows: AgentPerformanceRow[];
}

export function AgentPerformanceTable({ rows }: AgentPerformanceTableProps) {
  return (
    <section className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-center justify-between border-b border-[#eeeff1] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242529]">
            Agent performance
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">
            Calls handled per agent in the selected time range
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-zinc-500">
          No active agents in this time range.
        </div>
      ) : (
        <div>
          <div
            className="grid h-10 items-center border-b border-[#eeeff1] px-5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
            style={{
              gridTemplateColumns: "minmax(0,1fr) 120px 130px 130px",
            }}
          >
            <div>Agent</div>
            <div className="text-right tabular-nums">Total calls</div>
            <div className="text-right tabular-nums">Avg duration</div>
            <div className="text-right tabular-nums">Expected orders</div>
          </div>
          <div className="divide-y divide-[#eeeff1]">
            {rows.map((row) => (
              <div
                key={row.assistantId}
                className="grid h-10 items-center px-5 text-[13px] text-[#242529] transition-colors hover:bg-[#fbfbfb]"
                style={{
                  gridTemplateColumns: "minmax(0,1fr) 120px 130px 130px",
                }}
              >
                <div className="truncate font-medium">{row.agentName}</div>
                <div className="text-right tabular-nums">{row.totalCalls}</div>
                <div className="text-right tabular-nums text-zinc-600">
                  {formatAvgDuration(row.avgDurationSeconds)}
                </div>
                <div className="text-right tabular-nums text-zinc-600">
                  {formatExpectedOrders(row.expectedOrders)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
