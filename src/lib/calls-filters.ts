import {
  OUTCOME_CATEGORY_VALUES,
  type OutcomeCategory,
} from "@/lib/call-outcomes";
import { expandEndedReason } from "@/lib/call-ended-reasons";
import type { CallLogFilters } from "@/lib/calls";

export type RpcFilterArgs = {
  p_search?: string;
  p_direction?: string;
  p_sentiments?: string[];
  p_agents?: string[];
  p_location_ids?: string[];
  p_outcomes?: string[];
  p_outcome_null?: boolean;
  p_duration_min?: number;
  p_duration_max?: number;
  p_from?: string;
  p_to?: string;
  p_reviewed_state?: string;
  p_hours?: string;
  p_ended_reason?: string[];
  p_time_from_min?: number;
  p_time_to_min?: number;
  p_sort_by: string;
  p_sort_order: string;
};

/** Parse an "HH:MM" 24h string into minutes-of-day (0–1439). Returns undefined
 * for empty/malformed/out-of-range input so a bad value never narrows results. */
export function hhmmToMinutes(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

function normalizeSentimentFilter(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "positive") return "Positive";
  if (normalized === "neutral") return "Neutral";
  if (normalized === "negative") return "Negative";
  if (normalized === "unknown") return "Unknown";
  return value;
}

export function buildSentiments(
  filterValue: string | undefined,
): string[] | null {
  if (!filterValue || filterValue === "all") return null;
  const values = filterValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeSentimentFilter);
  return values.length > 0 ? values : null;
}

/** Split the multi-select agent filter CSV into assistant_ids. The UI joins
 * selections with "," into one URL param; the RPC takes text[] (p_agents), so
 * a single-value pass would only ever match one agent. */
export function buildAgents(filterValue: string | undefined): string[] | null {
  if (!filterValue || filterValue === "all") return null;
  const values = filterValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return values.length > 0 ? values : null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse the location filter CSV into a deduped list of UUIDs. Non-UUID entries
 * (a hand-edited URL) are dropped so a bad value can't 22P02 the RPC; if none
 * survive the filter is treated as absent (all locations). */
export function buildLocationIds(
  filterValue: string | undefined,
): string[] | null {
  if (!filterValue) return null;
  const values = Array.from(
    new Set(
      filterValue
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => UUID_RE.test(entry)),
    ),
  );
  return values.length > 0 ? values : null;
}

export function expandOutcome(filterValue: string | undefined): {
  outcomes: string[] | null;
  outcomeNull: boolean;
} {
  if (!filterValue || filterValue === "all") {
    return { outcomes: null, outcomeNull: false };
  }
  if (filterValue === "other") {
    return { outcomes: null, outcomeNull: true };
  }
  const values = OUTCOME_CATEGORY_VALUES[filterValue as OutcomeCategory] ?? [];
  return {
    outcomes: values.length > 0 ? values : null,
    outcomeNull: false,
  };
}

export function normalizeReviewedState(
  filterValue: string | undefined,
): string | undefined {
  if (!filterValue) return undefined;
  const segments = filterValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasReviewed = segments.includes("reviewed");
  const hasUnreviewed = segments.includes("unreviewed");
  if (hasReviewed && !hasUnreviewed) return "reviewed";
  if (hasUnreviewed && !hasReviewed) return "unreviewed";
  return undefined;
}

export function buildRpcFilterArgs(
  filters: CallLogFilters,
  rpcSortBy: string,
  rpcSortOrder: string,
): RpcFilterArgs {
  const { outcomes, outcomeNull } = expandOutcome(filters.outcome);
  const sentiments = buildSentiments(filters.sentiment);
  const agents = buildAgents(filters.agent);
  const locationIds = buildLocationIds(filters.locations);
  const endedReasons = expandEndedReason(filters.endedReason);

  // Clock-time-of-day range. Apply only when both ends parse and differ — equal
  // endpoints (or a missing/bad end) collapse to no-op, matching the RPC guard.
  const timeFromMin = hhmmToMinutes(filters.timeFrom);
  const timeToMin = hhmmToMinutes(filters.timeTo);
  const timeRangeActive =
    timeFromMin !== undefined &&
    timeToMin !== undefined &&
    timeFromMin !== timeToMin;

  return {
    p_search: filters.search?.trim() ? filters.search.trim() : undefined,
    p_direction:
      filters.direction && filters.direction !== "all"
        ? filters.direction
        : undefined,
    p_sentiments: sentiments ?? undefined,
    p_agents: agents ?? undefined,
    p_location_ids: locationIds ?? undefined,
    p_outcomes: outcomes ?? undefined,
    p_outcome_null: outcomeNull ? true : undefined,
    p_duration_min: filters.durationMin
      ? Number(filters.durationMin)
      : undefined,
    p_duration_max: filters.durationMax
      ? Number(filters.durationMax)
      : undefined,
    p_from: filters.from ? `${filters.from}T00:00:00` : undefined,
    p_to: filters.to ? `${filters.to}T23:59:59.999` : undefined,
    p_reviewed_state: normalizeReviewedState(filters.reviewedState),
    p_hours:
      filters.hours === "business" || filters.hours === "after"
        ? filters.hours
        : undefined,
    p_ended_reason: endedReasons ?? undefined,
    p_time_from_min: timeRangeActive ? timeFromMin : undefined,
    p_time_to_min: timeRangeActive ? timeToMin : undefined,
    p_sort_by: rpcSortBy,
    p_sort_order: rpcSortOrder,
  };
}
