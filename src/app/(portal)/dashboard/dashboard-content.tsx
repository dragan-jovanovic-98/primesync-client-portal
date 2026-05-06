"use client";

import { AgentPerformanceTable } from "@/components/dashboard/agent-performance-table";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CallOutcomesChart } from "@/components/dashboard/call-outcomes-chart";
import { HoursPieChart } from "@/components/dashboard/hours-pie-chart";
import { HourlyVolumeChart } from "@/components/dashboard/hourly-volume-chart";
import { DailyVolumeChart } from "@/components/dashboard/daily-volume-chart";
import { ChartsMobileSwitcher } from "@/components/dashboard/charts-mobile-switcher";
import { LocationFilter } from "@/components/dashboard/location-filter";
import type { DashboardData } from "./actions";

interface DashboardContentProps {
  firstName: string;
  activeAgents: number;
  dashboardData: DashboardData;
  debug?: boolean;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardContent({
  firstName,
  activeAgents,
  dashboardData,
  debug = false,
}: DashboardContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#242529]">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="mt-0.5 text-[14px] font-medium text-[rgba(0,0,0,0.7)]">
            {activeAgents} agent{activeAgents !== 1 ? "s" : ""} active
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LocationFilter locations={dashboardData.locationOptions} />
          <DateRangeFilter />
        </div>
      </div>

      <KpiCards data={dashboardData.kpiData} />

      {/* Desktop: full 4-chart layout in two grid rows */}
      <div className="hidden space-y-4 md:block">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CallOutcomesChart
              data={dashboardData.chartData.outcomeChartData}
            />
          </div>
          <HoursPieChart data={dashboardData.chartData.hoursData} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <HourlyVolumeChart data={dashboardData.chartData.volumeByHour} />
          <DailyVolumeChart data={dashboardData.chartData.volumeByDay} />
        </div>
      </div>

      {/* Mobile: tabbed chart switcher */}
      <div className="md:hidden">
        <ChartsMobileSwitcher chartData={dashboardData.chartData} />
      </div>

      <AgentPerformanceTable rows={dashboardData.agentPerformance} />

      {debug ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-950">
          <p className="font-semibold">Dashboard debug</p>
          <p className="mt-2">Range: {dashboardData.debug.rangeKey}</p>
          <p>From: {dashboardData.debug.from}</p>
          <p>To: {dashboardData.debug.to}</p>
          <p className="mt-2">Total calls: {dashboardData.kpiData.totalCalls}</p>
          <p>Appointments: {dashboardData.kpiData.conversions}</p>
          <div className="mt-2 space-y-1">
            {dashboardData.chartData.outcomeChartData.map((item) => (
              <p key={item.name}>
                {item.name}: {item.count}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
