"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/app/(portal)/dashboard/actions";
import { CallOutcomesChart } from "./call-outcomes-chart";
import { HoursPieChart } from "./hours-pie-chart";
import { HourlyVolumeChart } from "./hourly-volume-chart";
import { DailyVolumeChart } from "./daily-volume-chart";

const TABS = [
  { id: "outcomes", label: "Outcomes" },
  { id: "hours", label: "Hours" },
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  chartData: DashboardData["chartData"];
}

export function ChartsMobileSwitcher({ chartData }: Props) {
  const [active, setActive] = useState<TabId>("outcomes");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-0.5">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "h-7 rounded-md text-[12.5px] font-medium transition-all",
                isActive
                  ? "bg-white text-[#242529] shadow-sm"
                  : "text-[rgba(0,0,0,0.7)] hover:text-[#242529]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === "outcomes" && (
        <CallOutcomesChart data={chartData.outcomeChartData} />
      )}
      {active === "hours" && <HoursPieChart data={chartData.hoursData} />}
      {active === "hourly" && (
        <HourlyVolumeChart data={chartData.volumeByHour} />
      )}
      {active === "daily" && <DailyVolumeChart data={chartData.volumeByDay} />}
    </div>
  );
}
