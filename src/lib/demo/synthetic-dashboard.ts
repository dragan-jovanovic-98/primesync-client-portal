// Deterministic synthetic-data generator for the demo dashboard.
//
// Produces a DashboardMetricsPayload — the same shape get_portal_dashboard_metrics
// returns — so the existing adapter functions in the dashboard action render it
// unchanged. Data is generated per calendar day from a seed derived from that
// day's date, so:
//   - a given day looks identical no matter when the page loads or which window
//     (7/30/90-day) requested it — the windows stay mutually consistent;
//   - the `previous` comparison window is just earlier days, so trends are real;
//   - numbers never go stale: the window always ends today.
//
// Revenue math mirrors get_portal_dashboard_metrics's structure: `conversions`
// and `revenue_impact` are close-rate-weighted sums across categories (not raw
// outcome counts) and revenue applies no per-outcome weighting. The close rates
// are demo-specific (see DemoProfile.closeRates) and intentionally NOT sourced
// from the shared DEFAULT_REVENUE_SETTINGS, so tuning the demo never affects
// real clients' dashboards.
//
// Every business-shaped constant lives in ./demo-profiles.ts, keyed by
// company_id. This module is the vertical-agnostic engine.

import type { DashboardMetricsPayload } from "@/app/(portal)/dashboard/actions";
import { getOutcomeTier, type OutcomeCategory } from "@/lib/call-outcomes";
import type { DashboardDateRange } from "@/lib/date-range";
import { getDemoProfile, type DemoProfile } from "./demo-profiles";

// --- Deterministic PRNG (xmur3 seed -> mulberry32) ---------------------------

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

function pickIndex(rng: () => number, weights: ReadonlyArray<number>): number {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// --- Generation --------------------------------------------------------------

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type WindowResult = {
  totalCalls: number;
  totalDurationS: number;
  outcomeCounts: Map<OutcomeCategory, number>;
  hourCounts: number[]; // length 24
  weekdayCounts: number[]; // length 7, indexed by Date.getDay()
};

function emptyWindow(): WindowResult {
  return {
    totalCalls: 0,
    totalDurationS: 0,
    outcomeCounts: new Map(),
    hourCounts: new Array(24).fill(0),
    weekdayCounts: new Array(7).fill(0),
  };
}

function generateWindow(from: Date, to: Date, profile: DemoProfile): WindowResult {
  const result = emptyWindow();
  const outcomeWeights = profile.outcomeMix.map((o) => o.weight);
  // An empty namespace reproduces the pre-profile seed string exactly, keeping
  // the primesync demo's numbers unchanged. See DemoProfile.seedNamespace.
  const prefix = profile.seedNamespace ? `${profile.seedNamespace}:` : "";

  for (const day of eachDay(from, to)) {
    const rng = makeRng(`day:${prefix}${dateKey(day)}`);
    const weekday = day.getDay();
    const jitter = 1 + (rng() - 0.5) * 2 * profile.dailyJitter;
    const callCount = Math.max(
      0,
      Math.round(profile.baseCallsPerDay * profile.weekdayFactors[weekday] * jitter),
    );

    for (let i = 0; i < callCount; i++) {
      const category = profile.outcomeMix[pickIndex(rng, outcomeWeights)].category;
      result.outcomeCounts.set(
        category,
        (result.outcomeCounts.get(category) ?? 0) + 1,
      );

      const hour = pickIndex(rng, profile.hourWeights);
      result.hourCounts[hour] += 1;

      const triangular = (rng() + rng() + rng()) / 3;
      result.totalDurationS += Math.max(
        profile.durationMinS,
        Math.round(profile.durationBaseS + triangular * profile.durationSpreadS),
      );
    }

    result.totalCalls += callCount;
    result.weekdayCounts[weekday] += callCount;
  }

  return result;
}

// --- Revenue -----------------------------------------------------------------

function closeFraction(profile: DemoProfile, category: OutcomeCategory): number {
  return profile.closeRates[category];
}

type Kpi = {
  total_calls: number;
  minutes_talked: number;
  avg_duration_s: number;
  conversions: number;
  revenue_impact: number;
};

function buildKpi(window: WindowResult, profile: DemoProfile): Kpi {
  let conversions = 0;
  for (const [category, count] of window.outcomeCounts) {
    conversions += count * closeFraction(profile, category);
  }

  return {
    total_calls: window.totalCalls,
    minutes_talked: round2(window.totalDurationS / 60),
    avg_duration_s:
      window.totalCalls === 0
        ? 0
        : round2(window.totalDurationS / window.totalCalls),
    conversions: round2(conversions),
    revenue_impact: round2(conversions * profile.averageOrderValue),
  };
}

function buildOutcomes(
  window: WindowResult,
  profile: DemoProfile,
): DashboardMetricsPayload["outcomes"] {
  return [...window.outcomeCounts.entries()]
    .map(([category, count]) => ({
      category,
      tier: getOutcomeTier(category),
      count,
      estimated_value:
        count * Math.round(profile.averageOrderValue * closeFraction(profile, category)),
    }))
    .sort((a, b) => b.count - a.count);
}

function buildHoursSplit(
  window: WindowResult,
  profile: DemoProfile,
): DashboardMetricsPayload["hours_split"] {
  let businessHours = 0;
  for (let hour = 0; hour < 24; hour++) {
    if (hour >= profile.businessHourStart && hour < profile.businessHourEnd) {
      businessHours += window.hourCounts[hour];
    }
  }
  return {
    business_hours: businessHours,
    after_hours: window.totalCalls - businessHours,
  };
}

function buildHourlyVolume(
  window: WindowResult,
): DashboardMetricsPayload["hourly_volume"] {
  return window.hourCounts.map((count, hour) => ({ hour, count }));
}

function buildDailyVolume(
  window: WindowResult,
): DashboardMetricsPayload["daily_volume"] {
  return window.weekdayCounts.map((count, index) => ({
    day: WEEKDAY_KEYS[index],
    count,
  }));
}

function buildAgentPerformance(
  agents: ReadonlyArray<{ assistant_id: string; agent_name: string | null }>,
  window: WindowResult,
  conversions: number,
  profile: DemoProfile,
): DashboardMetricsPayload["agent_performance"] {
  const roster =
    agents.length > 0
      ? agents
      : (profile.fallbackAgents as ReadonlyArray<{
          assistant_id: string;
          agent_name: string | null;
        }>);

  const weights = roster.map(
    (agent) => 0.5 + makeRng(`agent:${agent.assistant_id}`)() * 1.5,
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const callCounts = roster.map((_, index) =>
    Math.floor((window.totalCalls * weights[index]) / totalWeight),
  );
  let remainder = window.totalCalls - callCounts.reduce((sum, c) => sum + c, 0);
  for (let i = 0; remainder > 0; i++, remainder--) {
    callCounts[i % callCounts.length] += 1;
  }

  const conversionRate =
    window.totalCalls === 0 ? 0 : conversions / window.totalCalls;

  return roster
    .map((agent, index) => {
      const agentCalls = callCounts[index];
      const durationRng = makeRng(`dur:${agent.assistant_id}`);
      return {
        assistant_id: agent.assistant_id,
        agent_name: agent.agent_name,
        total_calls: agentCalls,
        avg_duration_s:
          agentCalls === 0 ? 0 : round2(46 + durationRng() * 10),
        expected_orders: round2(agentCalls * conversionRate),
      };
    })
    .sort((a, b) => b.total_calls - a.total_calls);
}

// --- Public API --------------------------------------------------------------

export function buildSyntheticMetricsPayload(
  range: DashboardDateRange,
  agents: ReadonlyArray<{ assistant_id: string; agent_name: string | null }>,
  companyId: string,
): DashboardMetricsPayload {
  const profile = getDemoProfile(companyId);
  const current = generateWindow(range.from, range.to, profile);
  const previous = generateWindow(range.previousFrom, range.previousTo, profile);
  const currentKpi = buildKpi(current, profile);

  return {
    company_timezone: profile.timezone,
    revenue_settings_configured: true,
    current: currentKpi,
    previous: buildKpi(previous, profile),
    outcomes: buildOutcomes(current, profile),
    hours_split: buildHoursSplit(current, profile),
    hourly_volume: buildHourlyVolume(current),
    daily_volume: buildDailyVolume(current),
    agent_performance: buildAgentPerformance(
      agents,
      current,
      currentKpi.conversions,
      profile,
    ),
  };
}
