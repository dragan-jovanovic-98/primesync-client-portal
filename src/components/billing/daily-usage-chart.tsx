"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatCycleRange, type BillingDailyUsagePoint } from "@/lib/billing";

interface DailyUsageChartProps {
  points: BillingDailyUsagePoint[];
  cycleStart: string | null;
  cycleEnd: string | null;
  usedMinutes: number;
  includedMinutes: number;
}

function formatMinutes(value: number) {
  if (value >= 60) {
    const hours = value / 60;
    return `${hours.toFixed(1)}h`;
  }
  return `${value.toFixed(0)}m`;
}

export function DailyUsageChart({
  points,
  cycleStart,
  cycleEnd,
  usedMinutes,
  includedMinutes,
}: DailyUsageChartProps) {
  const chartData = points.map((point) => ({
    ...point,
    labelShort: format(parseISO(`${point.date}T00:00:00`), "MMM d"),
  }));

  const cycleLabel = formatCycleRange(cycleStart, cycleEnd);
  const includedLabel =
    includedMinutes > 0
      ? `${Math.round(usedMinutes)} of ${Math.round(includedMinutes)} minutes used this cycle`
      : `${Math.round(usedMinutes)} minutes used this cycle`;

  return (
    <section className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-center justify-between border-b border-[#eeeff1] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242529]">
            Usage this cycle
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">{cycleLabel}</p>
        </div>
        <p className="text-[12.5px] font-medium text-zinc-600 tabular-nums">
          {includedLabel}
        </p>
      </div>

      <div className="px-5 py-5">
        {points.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-zinc-500">
            No usage data yet for this cycle.
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eeeff1" vertical={false} />
                <XAxis
                  dataKey="labelShort"
                  stroke="rgba(0,0,0,0.45)"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  stroke="rgba(0,0,0,0.45)"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatMinutes(Number(value))}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #eeeff1",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  }}
                  labelStyle={{ color: "#242529", fontWeight: 600 }}
                  formatter={(value) => [
                    formatMinutes(Number(value ?? 0)),
                    "Minutes",
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar
                  dataKey="minutesUsed"
                  fill="#242529"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
