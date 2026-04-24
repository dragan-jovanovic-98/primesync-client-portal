import { unstable_noStore as noStore } from "next/cache";
import { getDashboardDateRange } from "@/lib/date-range";
import {
  getOutcomeLabel,
  OUTCOME_TIER_COLORS,
  type OutcomeCategory,
} from "@/lib/call-outcomes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Shapes consumed by dashboard-content.tsx and the chart/table components —
// kept identical so UI code doesn't change when aggregation moves to SQL.
export interface KpiData {
  totalCalls: number;
  minutesTalked: number;
  avgDuration: number;
  conversions: number;
  conversionLabel: string;
  revenueImpact: number;
  revenueSettingsConfigured: boolean;
  trends: {
    totalCalls: number | null;
    minutesTalked: number | null;
    avgDuration: number | null;
    conversions: number | null;
    revenueImpact: number | null;
  };
}

export type OutcomeChartData = {
  name: string;
  count: number;
  estimatedValue: number;
  color: string;
  impactTier: "high" | "medium" | "low";
};

export type HoursChartData = {
  total: number;
  businessHours: number;
  afterHours: number;
};

export type VolumeByHourData = {
  hour: number;
  count: number;
};

export type VolumeByDayData = {
  day: string;
  count: number;
};

export type AgentPerformanceRow = {
  assistantId: string;
  agentName: string;
  totalCalls: number;
  avgDurationSeconds: number;
  expectedOrders: number;
};

export type DashboardLocationOption = {
  id: string;
  name: string;
};

export type DashboardData = {
  activeAgents: number;
  kpiData: KpiData;
  agentPerformance: AgentPerformanceRow[];
  locationOptions: DashboardLocationOption[];
  debug: {
    rangeKey: string;
    from: string;
    to: string;
  };
  chartData: {
    outcomeChartData: OutcomeChartData[];
    hoursData: HoursChartData;
    volumeByHour: VolumeByHourData[];
    volumeByDay: VolumeByDayData[];
  };
};

// JSONB payload shape returned by get_portal_dashboard_metrics. Kept private
// to this file — the public DashboardData shape is the adapter's output.
type DashboardKpiPayload = {
  total_calls: number;
  minutes_talked: number | string;
  avg_duration_s: number | string;
  conversions: number | string;
  revenue_impact: number | string;
};

type DashboardMetricsPayload = {
  company_timezone: string;
  revenue_settings_configured: boolean;
  current: DashboardKpiPayload;
  previous: DashboardKpiPayload;
  outcomes: Array<{
    category: OutcomeCategory | string;
    tier: "high" | "medium" | "low";
    count: number;
    estimated_value: number;
  }>;
  hours_split: { business_hours: number; after_hours: number };
  hourly_volume: Array<{ hour: number; count: number }>;
  daily_volume: Array<{ day: string; count: number }>;
  agent_performance: Array<{
    assistant_id: string;
    agent_name: string | null;
    total_calls: number;
    avg_duration_s: number | string;
    expected_orders: number | string;
  }>;
};

type DashboardLocationRow = {
  id: string;
  location_name: string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function calculateTrend(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

// Weekday order matches what the daily-volume chart expects.
const WEEKDAY_ORDER: ReadonlyArray<{ key: string; label: string }> = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function buildKpi(
  current: DashboardKpiPayload,
  previous: DashboardKpiPayload,
  revenueSettingsConfigured: boolean,
): KpiData {
  const currentTotalCalls = current.total_calls;
  const previousTotalCalls = previous.total_calls;
  const currentMinutesTalked = toNumber(current.minutes_talked);
  const previousMinutesTalked = toNumber(previous.minutes_talked);
  const currentAvgDuration = toNumber(current.avg_duration_s);
  const previousAvgDuration = toNumber(previous.avg_duration_s);
  const currentConversions = toNumber(current.conversions);
  const previousConversions = toNumber(previous.conversions);
  const currentRevenueImpact = toNumber(current.revenue_impact);
  const previousRevenueImpact = toNumber(previous.revenue_impact);

  return {
    totalCalls: currentTotalCalls,
    minutesTalked: currentMinutesTalked,
    avgDuration: currentAvgDuration,
    conversions: currentConversions,
    conversionLabel: "Expected Orders",
    revenueImpact: Math.round(currentRevenueImpact),
    revenueSettingsConfigured,
    trends: {
      totalCalls: calculateTrend(currentTotalCalls, previousTotalCalls),
      minutesTalked: calculateTrend(currentMinutesTalked, previousMinutesTalked),
      avgDuration: calculateTrend(currentAvgDuration, previousAvgDuration),
      conversions: calculateTrend(currentConversions, previousConversions),
      revenueImpact: calculateTrend(currentRevenueImpact, previousRevenueImpact),
    },
  };
}

function buildOutcomeChartData(
  payload: DashboardMetricsPayload["outcomes"],
): OutcomeChartData[] {
  // SQL groups by category; one row per category. Convert to the UI shape
  // using the display label + tier color from call-outcomes.ts. SQL already
  // sorted by count desc.
  return payload.map((row) => ({
    name: getOutcomeLabel(row.category as string),
    count: row.count,
    estimatedValue: Number(row.estimated_value),
    color: OUTCOME_TIER_COLORS[row.tier],
    impactTier: row.tier,
  }));
}

function buildHoursData(
  payload: DashboardMetricsPayload["hours_split"],
): HoursChartData {
  return {
    total: payload.business_hours + payload.after_hours,
    businessHours: payload.business_hours,
    afterHours: payload.after_hours,
  };
}

function buildHourlyVolume(
  payload: DashboardMetricsPayload["hourly_volume"],
): VolumeByHourData[] {
  // SQL emits sparse hours; fill 0..23 so the chart always renders 24 bars.
  const counts = new Map<number, number>(
    payload.map((row) => [row.hour, row.count]),
  );
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: counts.get(hour) ?? 0,
  }));
}

function buildDailyVolume(
  payload: DashboardMetricsPayload["daily_volume"],
): VolumeByDayData[] {
  // SQL emits sparse weekdays in {mon,tue,...}; fill any missing day with 0
  // and map to the capitalized 3-letter labels the chart uses.
  const counts = new Map<string, number>(
    payload.map((row) => [row.day, row.count]),
  );
  return WEEKDAY_ORDER.map(({ key, label }) => ({
    day: label,
    count: counts.get(key) ?? 0,
  }));
}

function buildAgentPerformance(
  payload: DashboardMetricsPayload["agent_performance"],
): AgentPerformanceRow[] {
  // SQL returns every active agent, including idle ones (total_calls = 0).
  // Already sorted by total_calls desc.
  return payload.map((row) => ({
    assistantId: row.assistant_id,
    agentName: row.agent_name ?? row.assistant_id,
    totalCalls: row.total_calls,
    avgDurationSeconds: toNumber(row.avg_duration_s),
    expectedOrders: toNumber(row.expected_orders),
  }));
}

export async function getDashboardData(
  _companyId: string,
  searchParams: URLSearchParams,
): Promise<DashboardData> {
  noStore();
  const supabase = await createServerSupabaseClient();
  const range = getDashboardDateRange(searchParams);

  // Multi-select location filter from the URL. Empty/missing means "all
  // locations" — pass NULL so the RPC skips the filter.
  const rawLocations = searchParams.get("locations");
  const selectedLocationIds = rawLocations
    ? rawLocations.split(",").filter(Boolean)
    : [];
  const hasLocationFilter = selectedLocationIds.length > 0;

  // The generated Supabase types don't yet include the new RPC, so cast the
  // client to `any` for this call. The payload shape is validated against
  // DashboardMetricsPayload below.
  const rpcClient = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const [metricsResult, activeAgentsResult, locationsResult] = await Promise.all([
    rpcClient.rpc("get_portal_dashboard_metrics", {
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_previous_from: range.previousFrom.toISOString(),
      p_previous_to: range.previousTo.toISOString(),
      p_location_ids: hasLocationFilter ? selectedLocationIds : null,
    }),
    supabase
      .from("assistants")
      .select("assistant_id", { count: "exact", head: true })
      .eq("status", true),
    supabase
      .from("locations")
      .select("id, location_name")
      .returns<DashboardLocationRow[]>(),
  ]);

  if (metricsResult.error) {
    throw new Error(
      `Failed to load dashboard metrics: ${metricsResult.error.message}`,
    );
  }

  const payload = metricsResult.data as unknown as DashboardMetricsPayload;

  const kpiData = buildKpi(
    payload.current,
    payload.previous,
    payload.revenue_settings_configured,
  );

  const agentPerformance = buildAgentPerformance(payload.agent_performance);

  const locationOptions: DashboardLocationOption[] = (locationsResult.data ?? [])
    .filter((row) => row.location_name)
    .map((row) => ({ id: row.id, name: row.location_name as string }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    activeAgents: activeAgentsResult.count ?? 0,
    kpiData,
    agentPerformance,
    locationOptions,
    debug: {
      rangeKey: range.key,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    chartData: {
      outcomeChartData: buildOutcomeChartData(payload.outcomes),
      hoursData: buildHoursData(payload.hours_split),
      volumeByHour: buildHourlyVolume(payload.hourly_volume),
      volumeByDay: buildDailyVolume(payload.daily_volume),
    },
  };
}
