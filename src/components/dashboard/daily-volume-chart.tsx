"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { VolumeByDayData } from "@/app/(portal)/dashboard/actions";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: VolumeByDayData }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{item.day}</p>
      <p className="text-[12px] text-[rgba(0,0,0,0.7)]">
        {item.count} call{item.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function DailyVolumeChart({ data }: { data: VolumeByDayData[] }) {
  const busiest = data.reduce((max, item) => (item.count > max.count ? item : max), data[0]);

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-baseline gap-3 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Daily Volume
        </p>
        <span className="text-[12px] text-[rgba(0,0,0,0.3)]">
          Busiest: {busiest?.count ? busiest.day : "—"}
        </span>
      </div>
      <div className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ left: -20, right: 4 }}>
            <defs>
              <linearGradient id="dailyVolumeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F19A1F" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F19A1F" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: "rgba(0,0,0,0.4)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "rgba(0,0,0,0.3)" }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#F19A1F", strokeOpacity: 0.3 }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#F19A1F"
              strokeWidth={2.5}
              fill="url(#dailyVolumeFill)"
              dot={false}
              activeDot={{ r: 5, fill: "#F19A1F", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
