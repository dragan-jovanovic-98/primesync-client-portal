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
// are demo-specific (see DEMO_CLOSE_RATES) and intentionally NOT sourced from
// the shared DEFAULT_REVENUE_SETTINGS, so tuning the demo never affects real
// clients' dashboards.

import type { DashboardMetricsPayload } from "@/app/(portal)/dashboard/actions";
import { getOutcomeTier, type OutcomeCategory } from "@/lib/call-outcomes";
import type { DashboardDateRange } from "@/lib/date-range";

// --- Tunable profile ---------------------------------------------------------
// Calibrated against real bimmex-shop + oxford-automotive baselines. Adjust
// these constants after a sales review without touching the logic below.

const BASE_CALLS_PER_DAY = 20;
const DAILY_JITTER = 0.15; // ±15% day-to-day variance

// Indexed by Date.getDay() — 0 = Sunday .. 6 = Saturday. Weekends quieter.
const WEEKDAY_FACTORS = [0.35, 1.0, 1.05, 1.05, 1.0, 0.95, 0.55];

// Call duration draw: BASE + triangular(0..1) * SPREAD, clamped at MIN. Mean
// triangular ≈ 0.5, so mean duration ≈ 18 + 0.5 * 64 = ~50s.
const DURATION_BASE_S = 18;
const DURATION_SPREAD_S = 64;
const DURATION_MIN_S = 8;

// Outcome mix — weights sum to 1. Categories are OutcomeCategory values so they
// flow straight into the outcomes payload.
const OUTCOME_MIX: ReadonlyArray<{ category: OutcomeCategory; weight: number }> = [
  { category: "transfer", weight: 0.48 },
  { category: "general_inquiry", weight: 0.3 },
  { category: "appointment", weight: 0.12 },
  { category: "quote", weight: 0.05 },
  { category: "message", weight: 0.04 },
  { category: "urgent", weight: 0.01 },
];

// Relative call likelihood per hour 0..23 — skewed to business hours with
// mid-morning and mid-afternoon peaks.
const HOUR_WEIGHTS = [
  0.2, 0.15, 0.1, 0.1, 0.15, 0.3, 0.6, 1.2, // 0-7
  3.0, 6.0, 7.0, 6.0, 4.0, 4.0, 6.0, 6.0, // 8-15
  5.0, 3.5, 2.0, 1.5, 1.0, 0.7, 0.4, 0.3, // 16-23
];

const BUSINESS_HOUR_START = 8; // inclusive
const BUSINESS_HOUR_END = 18; // exclusive

const DEMO_TIMEZONE = "America/Los_Angeles";

// Fallback agents used only if the demo company has no active assistants.
const FALLBACK_AGENTS: ReadonlyArray<{ assistant_id: string; agent_name: string }> = [
  { assistant_id: "demo-agent-front-desk", agent_name: "Front Desk AI" },
  { assistant_id: "demo-agent-after-hours", agent_name: "After-Hours AI" },
  { assistant_id: "demo-agent-overflow", agent_name: "Overflow AI" },
];

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
const OUTCOME_WEIGHTS = OUTCOME_MIX.map((o) => o.weight);

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

function generateWindow(from: Date, to: Date): WindowResult {
  const result = emptyWindow();

  for (const day of eachDay(from, to)) {
    const rng = makeRng(`day:${dateKey(day)}`);
    const weekday = day.getDay();
    const jitter = 1 + (rng() - 0.5) * 2 * DAILY_JITTER;
    const callCount = Math.max(
      0,
      Math.round(BASE_CALLS_PER_DAY * WEEKDAY_FACTORS[weekday] * jitter),
    );

    for (let i = 0; i < callCount; i++) {
      const category = OUTCOME_MIX[pickIndex(rng, OUTCOME_WEIGHTS)].category;
      result.outcomeCounts.set(
        category,
        (result.outcomeCounts.get(category) ?? 0) + 1,
      );

      const hour = pickIndex(rng, HOUR_WEIGHTS);
      result.hourCounts[hour] += 1;

      const triangular = (rng() + rng() + rng()) / 3;
      result.totalDurationS += Math.max(
        DURATION_MIN_S,
        Math.round(DURATION_BASE_S + triangular * DURATION_SPREAD_S),
      );
    }

    result.totalCalls += callCount;
    result.weekdayCounts[weekday] += callCount;
  }

  return result;
}

// --- Revenue -----------------------------------------------------------------

const DEMO_AOV = 250;

// Per-category close rate (fraction) for the demo case study. Transfer and
// general inquiry are 0 — a transferred call or an info request is not a
// defensible revenue claim. Categories not in the generated outcome mix
// (towing, voicemail, reschedule_cancel, other) are 0 for completeness.
const DEMO_CLOSE_RATES: Record<OutcomeCategory, number> = {
  appointment: 0.5,
  quote: 0.2,
  urgent: 0.5,
  message: 0.15,
  transfer: 0,
  general_inquiry: 0,
  towing: 0,
  voicemail: 0,
  reschedule_cancel: 0,
  other: 0,
};

function closeFraction(category: OutcomeCategory): number {
  return DEMO_CLOSE_RATES[category];
}

type Kpi = {
  total_calls: number;
  minutes_talked: number;
  avg_duration_s: number;
  conversions: number;
  revenue_impact: number;
};

function buildKpi(window: WindowResult): Kpi {
  let conversions = 0;
  for (const [category, count] of window.outcomeCounts) {
    conversions += count * closeFraction(category);
  }

  return {
    total_calls: window.totalCalls,
    minutes_talked: round2(window.totalDurationS / 60),
    avg_duration_s:
      window.totalCalls === 0
        ? 0
        : round2(window.totalDurationS / window.totalCalls),
    conversions: round2(conversions),
    revenue_impact: round2(conversions * DEMO_AOV),
  };
}

function buildOutcomes(window: WindowResult): DashboardMetricsPayload["outcomes"] {
  return [...window.outcomeCounts.entries()]
    .map(([category, count]) => ({
      category,
      tier: getOutcomeTier(category),
      count,
      estimated_value: count * Math.round(DEMO_AOV * closeFraction(category)),
    }))
    .sort((a, b) => b.count - a.count);
}

function buildHoursSplit(
  window: WindowResult,
): DashboardMetricsPayload["hours_split"] {
  let businessHours = 0;
  for (let hour = 0; hour < 24; hour++) {
    if (hour >= BUSINESS_HOUR_START && hour < BUSINESS_HOUR_END) {
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
): DashboardMetricsPayload["agent_performance"] {
  const roster =
    agents.length > 0
      ? agents
      : (FALLBACK_AGENTS as ReadonlyArray<{
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
): DashboardMetricsPayload {
  const current = generateWindow(range.from, range.to);
  const previous = generateWindow(range.previousFrom, range.previousTo);
  const currentKpi = buildKpi(current);

  return {
    company_timezone: DEMO_TIMEZONE,
    revenue_settings_configured: true,
    current: currentKpi,
    previous: buildKpi(previous),
    outcomes: buildOutcomes(current),
    hours_split: buildHoursSplit(current),
    hourly_volume: buildHourlyVolume(current),
    daily_volume: buildDailyVolume(current),
    agent_performance: buildAgentPerformance(
      agents,
      current,
      currentKpi.conversions,
    ),
  };
}
