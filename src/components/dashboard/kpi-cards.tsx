"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiData } from "@/app/(portal)/dashboard/actions";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatExpectedOrders(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return null;
  const isNeutral = value === 0;
  const isPositive = value > 0;

  if (isNeutral) {
    return <span className="text-[12px] font-medium text-[rgba(0,0,0,0.3)]">0%</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[12px] font-medium",
        isPositive ? "text-[var(--success)]" : "text-[var(--warning)]",
      )}
    >
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    { label: "Total Calls", value: data.totalCalls.toLocaleString(), trend: data.trends.totalCalls },
    {
      label: "Minutes Talked",
      value: data.minutesTalked.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      trend: data.trends.minutesTalked,
    },
    { label: "Avg Duration", value: formatDuration(data.avgDuration), trend: data.trends.avgDuration },
    {
      label: data.conversionLabel,
      value: formatExpectedOrders(data.conversions),
      trend: data.trends.conversions,
    },
    {
      label: "Revenue Impact",
      value: formatCurrency(data.revenueImpact),
      trend: data.trends.revenueImpact,
      note: !data.revenueSettingsConfigured ? "Using default settings" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#eeeff1] bg-[#eeeff1] xl:grid-cols-5">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={cn(
            "flex flex-col justify-between bg-white px-5 py-5",
            index === 0 && "col-span-2 xl:col-span-1",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
            {card.label}
          </p>
          <div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="tabular-nums text-[22px] font-bold leading-none tracking-[-0.5px] text-[#242529]">
                {card.value}
              </p>
              <Trend value={card.trend} />
            </div>
            {card.note ? (
              <p className="mt-2 text-[11px] text-[rgba(0,0,0,0.3)]">{card.note}</p>
            ) : (
              <p className="mt-2 text-[11px] text-[rgba(0,0,0,0.3)]">vs. previous period</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
