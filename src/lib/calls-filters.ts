import {
  OUTCOME_CATEGORY_VALUES,
  type OutcomeCategory,
} from "@/lib/call-outcomes";
import type { CallLogFilters } from "@/lib/calls";

export type RpcFilterArgs = {
  p_search?: string;
  p_direction?: string;
  p_sentiments?: string[];
  p_agent?: string;
  p_outcomes?: string[];
  p_outcome_null?: boolean;
  p_duration_min?: number;
  p_duration_max?: number;
  p_from?: string;
  p_to?: string;
  p_reviewed_state?: string;
  p_hours?: string;
  p_sort_by: string;
  p_sort_order: string;
};

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

  return {
    p_search: filters.search?.trim() ? filters.search.trim() : undefined,
    p_direction:
      filters.direction && filters.direction !== "all"
        ? filters.direction
        : undefined,
    p_sentiments: sentiments ?? undefined,
    p_agent:
      filters.agent && filters.agent !== "all" ? filters.agent : undefined,
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
    p_sort_by: rpcSortBy,
    p_sort_order: rpcSortOrder,
  };
}
