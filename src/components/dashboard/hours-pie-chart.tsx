"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Label, Tooltip } from "recharts";
import type { HoursChartData } from "@/app/(portal)/dashboard/actions";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.[0]) return null;
  const { name, value } = payload[0];

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{name}</p>
      <p className="text-[12px] text-[rgba(0,0,0,0.7)]">
        {value} call{value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function HoursPieChart({ data }: { data: HoursChartData }) {
  const chartData = [
    { name: "Business Hours", value: data.businessHours, color: "#0F1841" },
    { name: "After Hours", value: data.afterHours, color: "#F19A1F" },
  ].filter((item) => item.value > 0);

  if (data.total === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Call Hours
        </p>
        <p className="mt-2 text-[13px] text-[rgba(0,0,0,0.7)]">No calls in this period.</p>
      </div>
    );
  }

  const businessPct = Math.round((data.businessHours / data.total) * 100);
  const afterPct = Math.round((data.afterHours / data.total) * 100);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#eeeff1] bg-white">
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Call Hours
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-4">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={58}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <Label
                content={() => (
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                    <tspan x="50%" dy="-6" fontSize="22" fontWeight="700" fill="#242529" letterSpacing="-0.5" fontFamily="var(--font-geist-mono)">
                      {data.total}
                    </tspan>
                    <tspan x="50%" dy="18" fontSize="11" fontWeight="600" fill="rgba(0,0,0,0.35)" letterSpacing="1">
                      CALLS
                    </tspan>
                  </text>
                )}
              />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#0F1841]" />
            <div>
              <span className="font-mono text-[14px] font-bold tabular-nums text-[#242529]">{businessPct}%</span>
              <span className="ml-1.5 text-[12px] text-[rgba(0,0,0,0.4)]">Business hours</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#F19A1F]" />
            <div>
              <span className="font-mono text-[14px] font-bold tabular-nums text-[#242529]">{afterPct}%</span>
              <span className="ml-1.5 text-[12px] text-[rgba(0,0,0,0.4)]">After hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
