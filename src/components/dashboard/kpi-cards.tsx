"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Phone,
  ShoppingCart,
  Timer,
  type LucideIcon,
} from "lucide-react";
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
        "inline-flex items-center gap-0.5 font-mono text-[12px] font-medium tabular-nums",
        isPositive ? "text-[var(--success)]" : "text-[var(--warning)]",
      )}
    >
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export function KpiCards({ data }: { data: KpiData }) {
  const cards: {
    label: string;
    value: string;
    trend: number | null;
    icon: LucideIcon;
    note?: string;
  }[] = [
    {
      label: "Total Calls",
      value: data.totalCalls.toLocaleString(),
      trend: data.trends.totalCalls,
      icon: Phone,
    },
    {
      label: "Minutes Talked",
      value: data.minutesTalked.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      trend: data.trends.minutesTalked,
      icon: Clock,
    },
    {
      label: "Avg Duration",
      value: formatDuration(data.avgDuration),
      trend: data.trends.avgDuration,
      icon: Timer,
    },
    {
      label: data.conversionLabel,
      value: formatExpectedOrders(data.conversions),
      trend: data.trends.conversions,
      icon: ShoppingCart,
    },
    {
      label: "Revenue Impact",
      value: formatCurrency(data.revenueImpact),
      trend: data.trends.revenueImpact,
      icon: BarChart3,
      note: !data.revenueSettingsConfigured ? "Using default settings" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "group flex items-start gap-3 rounded-xl border border-[#eeeff1] bg-white px-4 py-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#F19A1F]/70 hover:shadow-[0_4px_16px_rgba(241,154,31,0.10)]",
              index === 0 && "col-span-2 xl:col-span-1",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F19A1F] text-white">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[rgba(0,0,0,0.65)]">
                {card.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="font-mono text-[20px] font-bold leading-none tracking-[-0.5px] tabular-nums text-[#242529] sm:text-[23px]">
                  {card.value}
                </p>
                <Trend value={card.trend} />
              </div>
              <p className="mt-1.5 text-[11px] text-[rgba(0,0,0,0.35)]">
                {card.note ?? "vs. previous period"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
