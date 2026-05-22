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
import type { VolumeByHourData } from "@/app/(portal)/dashboard/actions";

function formatHour(hour: number) {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function formatHourFull(hour: number) {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  return hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) {
  if (!active || !payload?.[0] || label === undefined) return null;
  const hour = Number(label);
  const isBusinessHours = hour >= 9 && hour < 17;

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{formatHourFull(hour)}</p>
      <p className="text-[12px] text-[rgba(0,0,0,0.7)]">
        {payload[0].value} call{payload[0].value !== 1 ? "s" : ""}
      </p>
      {isBusinessHours ? (
        <p className="mt-0.5 text-[11px] text-[rgba(0,0,0,0.35)]">Business hours</p>
      ) : null}
    </div>
  );
}

export function HourlyVolumeChart({ data }: { data: VolumeByHourData[] }) {
  const peak = data.reduce((max, item) => (item.count > max.count ? item : max), data[0]);

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-baseline gap-3 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Hourly Volume
        </p>
        <span className="text-[12px] text-[rgba(0,0,0,0.3)]">
          Peak: {peak?.count ? formatHourFull(peak.hour) : "—"}
        </span>
      </div>
      <div className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ left: -20, right: 4 }}>
            <defs>
              <linearGradient id="hourlyVolumeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F19A1F" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F19A1F" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis
              dataKey="hour"
              tickFormatter={formatHour}
              tick={{ fontSize: 11, fill: "rgba(0,0,0,0.3)" }}
              interval={2}
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
              fill="url(#hourlyVolumeFill)"
              dot={{ r: 3, fill: "#F19A1F", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#F19A1F", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
