import { unstable_noStore as noStore } from "next/cache";
import { getDashboardDateRange } from "@/lib/date-range";
import {
  getOutcomeCategory,
  getOutcomeLabel,
  getOutcomeTier,
  OUTCOME_TIER_COLORS,
} from "@/lib/call-outcomes";
import {
  normalizeRevenueSettings,
  type RevenueCategoryKey,
} from "@/lib/revenue-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DashboardCall = {
  call_id: string;
  assistant_id: string | null;
  location_id: string | null;
  call_date: string | null;
  call_duration_s: number | null;
  call_outcome: string | null;
  appointment_activity: boolean | null;
  appointment_scheduled: boolean | null;
  appointment_reviewed: boolean | null;
  appointment_scheduling_review: boolean | null;
};

type ClientSettingsRow = {
  timezone: string | null;
};

type BusinessHoursEntry = {
  open?: string | null;
  close?: string | null;
} | null;

type BusinessHoursSchedule = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", BusinessHoursEntry>
>;

type LocationRow = {
  id: string;
  timezone: string | null;
  business_hours: BusinessHoursSchedule | null;
  location_name: string | null;
};

type AssistantLocationRow = {
  assistant_id: string;
  location_id: string | null;
  agent_name: string | null;
  status: boolean | null;
};

type LocationClosureRow = {
  location_id: string;
  closure_date: string;
  recurring: boolean;
};

type RevenueSettingsRow = {
  average_order_value: number | string | null;
  category_settings: Record<string, { enabled?: boolean; closeRate?: number }> | null;
};

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

type TimeParts = {
  weekday: string;
  hour: number;
};

type LocalDateParts = {
  weekdayKey: keyof BusinessHoursSchedule;
  minutes: number;
  monthDay: string;
  dateKey: string;
};

const FALLBACK_TIME_ZONE = "America/Los_Angeles";
const FALLBACK_OPEN_MINUTES = 9 * 60;
const FALLBACK_CLOSE_MINUTES = 17 * 60;

function calculateTrend(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function getLocalDateParts(value: string, timeZone: string): LocalDateParts {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const weekdayRaw = parts.find((part) => part.type === "weekday")?.value?.slice(0, 3).toLowerCase() ?? "mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const weekdayKey = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(weekdayRaw)
    ? weekdayRaw
    : "mon") as keyof BusinessHoursSchedule;

  return {
    weekdayKey,
    minutes: hour * 60 + minute,
    monthDay: `${month}-${day}`,
    dateKey: `${year}-${month}-${day}`,
  };
}

function getTimeParts(value: string, timeZone: string): TimeParts {
  const localParts = getLocalDateParts(value, timeZone);
  const weekday = localParts.weekdayKey[0].toUpperCase() + localParts.weekdayKey.slice(1);
  const hour = Math.floor(localParts.minutes / 60);

  return { weekday, hour };
}

function buildHourlySeries(calls: DashboardCall[], timeZone: string) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

  for (const call of calls) {
    if (!call.call_date) continue;
    const { hour } = getTimeParts(call.call_date, timeZone);
    buckets[hour].count += 1;
  }

  return buckets;
}

function buildDailySeries(calls: DashboardCall[], timeZone: string) {
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = new Map(order.map((day) => [day, 0]));

  for (const call of calls) {
    if (!call.call_date) continue;
    const { weekday } = getTimeParts(call.call_date, timeZone);
    const normalized = weekday.slice(0, 3);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return order.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function isLocationClosed(localParts: LocalDateParts, closures: LocationClosureRow[]) {
  return closures.some((closure) =>
    closure.recurring ? closure.closure_date.slice(5, 10) === localParts.monthDay : closure.closure_date === localParts.dateKey
  );
}

function isWithinBusinessHours(
  call: DashboardCall,
  companyTimeZone: string,
  assistantLocations: Map<string, string>,
  locations: Map<string, LocationRow>,
  closuresByLocation: Map<string, LocationClosureRow[]>,
) {
  if (!call.call_date) return false;

  const resolvedLocationId = call.location_id ?? (call.assistant_id ? assistantLocations.get(call.assistant_id) : undefined);
  const location = resolvedLocationId ? locations.get(resolvedLocationId) : undefined;
  const timeZone = location?.timezone || companyTimeZone || FALLBACK_TIME_ZONE;
  const localParts = getLocalDateParts(call.call_date, timeZone);

  if (!location || !resolvedLocationId) {
    return localParts.minutes >= FALLBACK_OPEN_MINUTES && localParts.minutes < FALLBACK_CLOSE_MINUTES;
  }
  const closures = closuresByLocation.get(resolvedLocationId) ?? [];
  if (isLocationClosed(localParts, closures)) return false;

  const daySchedule = location.business_hours?.[localParts.weekdayKey];
  if (!daySchedule?.open || !daySchedule?.close) {
    return localParts.minutes >= FALLBACK_OPEN_MINUTES && localParts.minutes < FALLBACK_CLOSE_MINUTES;
  }

  const openMinutes = parseTimeToMinutes(daySchedule.open);
  const closeMinutes = parseTimeToMinutes(daySchedule.close);
  if (openMinutes === null || closeMinutes === null) {
    return localParts.minutes >= FALLBACK_OPEN_MINUTES && localParts.minutes < FALLBACK_CLOSE_MINUTES;
  }

  if (openMinutes === closeMinutes) return true;
  if (openMinutes < closeMinutes) {
    return localParts.minutes >= openMinutes && localParts.minutes < closeMinutes;
  }

  return localParts.minutes >= openMinutes || localParts.minutes < closeMinutes;
}

function buildHoursData(
  calls: DashboardCall[],
  companyTimeZone: string,
  assistantLocations: Map<string, string>,
  locations: Map<string, LocationRow>,
  closuresByLocation: Map<string, LocationClosureRow[]>,
): HoursChartData {
  let businessHours = 0;
  let afterHours = 0;

  for (const call of calls) {
    if (!call.call_date) continue;
    if (
      isWithinBusinessHours(
        call,
        companyTimeZone,
        assistantLocations,
        locations,
        closuresByLocation,
      )
    ) {
      businessHours += 1;
    } else {
      afterHours += 1;
    }
  }

  return {
    total: businessHours + afterHours,
    businessHours,
    afterHours,
  };
}

function buildOutcomeData(
  calls: DashboardCall[],
  revenueSettings: ReturnType<typeof normalizeRevenueSettings>,
): OutcomeChartData[] {
  const counts = new Map<
    string,
    {
      count: number;
      estimatedValue: number;
      impactTier: "high" | "medium" | "low";
      color: string;
    }
  >();

  for (const call of calls) {
    const category = getOutcomeCategory(call.call_outcome);
    const label = getOutcomeLabel(call.call_outcome);
    const impactTier = getOutcomeTier(category);
    const categorySettings = revenueSettings.categories[category as RevenueCategoryKey];
    const estimatedValue = categorySettings.enabled
      ? Math.round(
          revenueSettings.averageOrderValue * (categorySettings.closeRate / 100),
        )
      : 0;
    const existing = counts.get(label);

    counts.set(label, {
      count: (existing?.count ?? 0) + 1,
      estimatedValue: (existing?.estimatedValue ?? 0) + estimatedValue,
      impactTier,
      color: OUTCOME_TIER_COLORS[impactTier],
    });
  }

  return [...counts.entries()]
    .map(([name, value]) => ({
      name,
      count: value.count,
      estimatedValue: value.estimatedValue,
      impactTier: value.impactTier,
      color: value.color,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildKpiData(
  currentCalls: DashboardCall[],
  previousCalls: DashboardCall[],
  revenueSettings: ReturnType<typeof normalizeRevenueSettings>,
  revenueSettingsConfigured: boolean,
): KpiData {
  const currentTotalCalls = currentCalls.length;
  const previousTotalCalls = previousCalls.length;

  const currentMinutesTalked = currentCalls.reduce(
    (sum, call) => sum + Math.max(0, call.call_duration_s ?? 0),
    0,
  ) / 60;
  const previousMinutesTalked = previousCalls.reduce(
    (sum, call) => sum + Math.max(0, call.call_duration_s ?? 0),
    0,
  ) / 60;

  const currentAvgDuration = currentTotalCalls > 0
    ? currentCalls.reduce((sum, call) => sum + Math.max(0, call.call_duration_s ?? 0), 0) / currentTotalCalls
    : 0;
  const previousAvgDuration = previousTotalCalls > 0
    ? previousCalls.reduce((sum, call) => sum + Math.max(0, call.call_duration_s ?? 0), 0) / previousTotalCalls
    : 0;

  const currentConversions = currentCalls.reduce((sum, call) => {
    const category = getOutcomeCategory(call.call_outcome) as RevenueCategoryKey;
    const categorySettings = revenueSettings.categories[category];
    if (!categorySettings.enabled) return sum;
    return sum + categorySettings.closeRate / 100;
  }, 0);
  const previousConversions = previousCalls.reduce((sum, call) => {
    const category = getOutcomeCategory(call.call_outcome) as RevenueCategoryKey;
    const categorySettings = revenueSettings.categories[category];
    if (!categorySettings.enabled) return sum;
    return sum + categorySettings.closeRate / 100;
  }, 0);

  const revenueImpact = currentCalls.reduce((sum, call) => {
    const category = getOutcomeCategory(call.call_outcome) as RevenueCategoryKey;
    const categorySettings = revenueSettings.categories[category];
    if (!categorySettings.enabled) return sum;
    return sum + revenueSettings.averageOrderValue * (categorySettings.closeRate / 100);
  }, 0);
  const previousRevenueImpact = previousCalls.reduce((sum, call) => {
    const category = getOutcomeCategory(call.call_outcome) as RevenueCategoryKey;
    const categorySettings = revenueSettings.categories[category];
    if (!categorySettings.enabled) return sum;
    return sum + revenueSettings.averageOrderValue * (categorySettings.closeRate / 100);
  }, 0);

  return {
    totalCalls: currentTotalCalls,
    minutesTalked: currentMinutesTalked,
    avgDuration: currentAvgDuration,
    conversions: currentConversions,
    conversionLabel: "Expected Orders",
    revenueImpact: Math.round(revenueImpact),
    revenueSettingsConfigured,
    trends: {
      totalCalls: calculateTrend(currentTotalCalls, previousTotalCalls),
      minutesTalked: calculateTrend(currentMinutesTalked, previousMinutesTalked),
      avgDuration: calculateTrend(currentAvgDuration, previousAvgDuration),
      conversions: calculateTrend(currentConversions, previousConversions),
      revenueImpact: calculateTrend(revenueImpact, previousRevenueImpact),
    },
  };
}

export async function getDashboardData(
  companyId: string,
  searchParams: URLSearchParams,
): Promise<DashboardData> {
  noStore();
  const supabase = await createServerSupabaseClient();
  const range = getDashboardDateRange(searchParams);
  const fallbackSettings = {
    timezone: FALLBACK_TIME_ZONE,
  };

  // Multi-select location filter from the URL. Empty/missing means "all
  // locations" (rollup default). When present, apply to both the current and
  // previous calls queries so the trend math stays consistent.
  const rawLocations = searchParams.get("locations");
  const selectedLocationIds = rawLocations
    ? rawLocations.split(",").filter(Boolean)
    : [];
  const hasLocationFilter = selectedLocationIds.length > 0;

  const currentCallsQuery = supabase
    .from("all_client_calls")
    .select(
      "call_id, assistant_id, location_id, call_date, call_duration_s, call_outcome, appointment_activity, appointment_scheduled, appointment_reviewed, appointment_scheduling_review",
    )
    .eq("company_id", companyId)
    .gte("call_date", range.from.toISOString())
    .lte("call_date", range.to.toISOString());
  if (hasLocationFilter) {
    currentCallsQuery.in("location_id", selectedLocationIds);
  }

  const previousCallsQuery = supabase
    .from("all_client_calls")
    .select(
      "call_id, assistant_id, location_id, call_date, call_duration_s, call_outcome, appointment_activity, appointment_scheduled, appointment_reviewed, appointment_scheduling_review",
    )
    .eq("company_id", companyId)
    .gte("call_date", range.previousFrom.toISOString())
    .lte("call_date", range.previousTo.toISOString());
  if (hasLocationFilter) {
    previousCallsQuery.in("location_id", selectedLocationIds);
  }

  const [
    { data: currentCallsData },
    { data: previousCallsData },
    { data: clientSettings },
    { data: assistantRows },
    { data: locationRows },
    { data: locationClosures },
    { data: revenueSettingsRow },
    { count: activeAgentsCount },
  ] = await Promise.all([
    currentCallsQuery.order("call_date", { ascending: true }),
    previousCallsQuery.order("call_date", { ascending: true }),
    supabase
      .from("clients")
      .select("timezone")
      .eq("company_id", companyId)
      .maybeSingle<ClientSettingsRow>(),
    supabase
      .from("assistants")
      .select("assistant_id, location_id, agent_name, status")
      .eq("company_id", companyId)
      .returns<AssistantLocationRow[]>(),
    supabase
      .from("locations")
      .select("id, timezone, business_hours, location_name")
      .eq("company_id", companyId)
      .returns<LocationRow[]>(),
    supabase
      .from("location_closures")
      .select("location_id, closure_date, recurring")
      .returns<LocationClosureRow[]>(),
    supabase
      .from("portal_revenue_settings")
      .select("average_order_value, category_settings")
      .eq("company_id", companyId)
      .maybeSingle<RevenueSettingsRow>(),
    supabase
      .from("assistants")
      .select("assistant_id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", true),
  ]);

  const settings = {
    timezone: clientSettings?.timezone || fallbackSettings.timezone,
  };
  const assistantLocations = new Map(
    (assistantRows ?? [])
      .filter((row): row is AssistantLocationRow & { location_id: string } => Boolean(row.assistant_id && row.location_id))
      .map((row) => [row.assistant_id, row.location_id]),
  );
  const locations = new Map((locationRows ?? []).map((location) => [location.id, location]));
  const locationIds = new Set((locationRows ?? []).map((location) => location.id));
  const closuresByLocation = new Map<string, LocationClosureRow[]>();
  for (const closure of locationClosures ?? []) {
    if (!locationIds.has(closure.location_id)) continue;
    const existing = closuresByLocation.get(closure.location_id) ?? [];
    existing.push(closure);
    closuresByLocation.set(closure.location_id, existing);
  }
  const revenueSettings = normalizeRevenueSettings({
    averageOrderValue:
      typeof revenueSettingsRow?.average_order_value === "string"
        ? Number(revenueSettingsRow.average_order_value)
        : (revenueSettingsRow?.average_order_value ?? undefined),
    categories: (revenueSettingsRow?.category_settings ?? undefined) as any,
  });

  const currentCalls = (currentCallsData ?? []).filter(
    (call): call is DashboardCall => Boolean(call.call_id),
  );
  const previousCalls = (previousCallsData ?? []).filter(
    (call): call is DashboardCall => Boolean(call.call_id),
  );

  const kpiData = buildKpiData(
    currentCalls,
    previousCalls,
    revenueSettings,
    Boolean(revenueSettingsRow),
  );

  // Agent performance aggregation — only active agents, ordered by call volume
  // desc. An agent without any calls in the current range still appears so the
  // client can see which of their agents are idle. Expected orders uses the
  // same formula as the KPI card: sum of closeRate/100 for calls whose outcome
  // category is enabled in the company's revenue settings.
  const activeAssistants = (assistantRows ?? []).filter(
    (row) => row.status === true && row.assistant_id,
  );
  const agentTotals = new Map<
    string,
    { totalCalls: number; totalDurationS: number; expectedOrders: number }
  >();
  for (const assistant of activeAssistants) {
    agentTotals.set(assistant.assistant_id, {
      totalCalls: 0,
      totalDurationS: 0,
      expectedOrders: 0,
    });
  }
  for (const call of currentCalls) {
    if (!call.assistant_id) continue;
    const bucket = agentTotals.get(call.assistant_id);
    if (!bucket) continue;
    bucket.totalCalls += 1;
    bucket.totalDurationS += call.call_duration_s ?? 0;
    const category = getOutcomeCategory(call.call_outcome) as RevenueCategoryKey;
    const categorySettings = revenueSettings.categories[category];
    if (categorySettings?.enabled) {
      bucket.expectedOrders += categorySettings.closeRate / 100;
    }
  }
  const agentPerformance: AgentPerformanceRow[] = activeAssistants
    .map((assistant) => {
      const bucket = agentTotals.get(assistant.assistant_id)!;
      const avgDurationSeconds =
        bucket.totalCalls > 0 ? bucket.totalDurationS / bucket.totalCalls : 0;
      return {
        assistantId: assistant.assistant_id,
        agentName: assistant.agent_name ?? assistant.assistant_id,
        totalCalls: bucket.totalCalls,
        avgDurationSeconds,
        expectedOrders: bucket.expectedOrders,
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);

  const locationOptions: DashboardLocationOption[] = (locationRows ?? [])
    .filter((row) => row.location_name)
    .map((row) => ({
      id: row.id,
      name: row.location_name as string,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    activeAgents: activeAgentsCount ?? 0,
    kpiData,
    agentPerformance,
    locationOptions,
    debug: {
      rangeKey: range.key,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    chartData: {
      outcomeChartData: buildOutcomeData(
        currentCalls,
        revenueSettings,
      ),
      hoursData: buildHoursData(
        currentCalls,
        settings.timezone,
        assistantLocations,
        locations,
        closuresByLocation,
      ),
      volumeByHour: buildHourlySeries(currentCalls, settings.timezone),
      volumeByDay: buildDailySeries(currentCalls, settings.timezone),
    },
  };
}
