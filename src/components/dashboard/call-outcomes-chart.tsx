"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { OutcomeChartData } from "@/app/(portal)/dashboard/actions";
import { OUTCOME_TIER_COLORS, OUTCOME_TIER_LABELS } from "@/lib/call-outcomes";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: OutcomeChartData }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{item.name}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-[12px] text-[rgba(0,0,0,0.55)]">
          {item.count} call{item.count !== 1 ? "s" : ""}
        </p>
        <p className="text-[12px] text-[rgba(0,0,0,0.55)]">
          {formatCurrency(item.estimatedValue)} est. value
        </p>
      </div>
    </div>
  );
}

export function CallOutcomesChart({ data }: { data: OutcomeChartData[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Call Outcomes
        </p>
        <p className="mt-2 text-[13px] text-[rgba(0,0,0,0.55)]">No data for this period.</p>
      </div>
    );
  }

  const chartHeight = Math.max(200, data.length * 40 + 20);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Call Outcomes
        </p>
        <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.35)]">
          {Object.entries(OUTCOME_TIER_LABELS).map(([tier, label]) => (
            <span key={tier} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: OUTCOME_TIER_COLORS[tier as keyof typeof OUTCOME_TIER_COLORS] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 pb-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "rgba(0,0,0,0.3)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={118}
              tick={{ fontSize: 12, fill: "#242529", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8f9fa" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
