import {
  getOutcomeCategory,
  getOutcomeLabel,
  getOutcomeTier,
  OUTCOME_CATEGORY_VALUES,
  type OutcomeCategory,
} from "@/lib/call-outcomes";
import type { Database } from "@/types/database";

export type CallDirection = "inbound" | "outbound";

// List row used by /calls — shape matches the get_portal_calls RPC return.
// The plpgsql RETURNS TABLE drops nullability information, so we re-add it
// here to reflect the underlying all_client_calls column nullability.
export type CallLog = {
  call_id: string;
  assistant_id: string | null;
  location_id: string | null;
  call_date: string | null;
  call_duration_s: number | null;
  call_outcome: string | null;
  user_sentiment: string | null;
  call_direction: string | null;
  phone_number: number | null;
  summary: string | null;
  agent_name: string | null;
  reviewed: boolean;
  ended_reason: string | null;
  /** Effective IANA timezone for this call (location → company → LA), resolved
   * by get_portal_calls so the displayed time matches the time-of-day filter. */
  local_tz: string | null;
};

// Detail row used by /calls/[id] — full all_client_calls row returned by the
// get_portal_call RPC. Generated directly from the database schema so it stays
// in sync with column changes.
export type CallLogDetail =
  Database["public"]["Functions"]["get_portal_call"]["Returns"];

export type CallLogFilters = {
  /** Company id is no longer used by the action layer (the RPC derives it from
   * auth.uid()), but we keep it on the type for backward compatibility with
   * existing call sites. */
  companyId?: string;
  page?: number;
  perPage?: number;
  search?: string;
  direction?: string;
  sentiment?: string;
  agent?: string;
  outcome?: string;
  sortBy?: string;
  sortOrder?: string;
  from?: string;
  to?: string;
  durationMin?: string;
  durationMax?: string;
  hours?: string;
  reviewedState?: string;
  endedReason?: string;
  /** Local clock-time-of-day range, "HH:MM" 24h. Both required for the filter
   * to apply; equal/empty endpoints are treated as a no-op. */
  timeFrom?: string;
  timeTo?: string;
};

export type CallLogResult = {
  calls: Array<CallLog & { isBusinessHours: boolean | null }>;
  total: number;
  page: number;
  perPage: number;
};

export const SENTIMENT_STYLES: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  positive: {
    label: "Positive",
    pill: "bg-[rgba(15,118,110,0.1)] text-[#0F766E]",
    dot: "bg-[#0F766E]",
  },
  neutral: {
    label: "Neutral",
    pill: "bg-zinc-100 text-zinc-700",
    dot: "bg-zinc-500",
  },
  negative: {
    label: "Negative",
    pill: "bg-[rgba(194,65,12,0.1)] text-[#C2410C]",
    dot: "bg-[#C2410C]",
  },
};

export function normalizeSentiment(value: string | null) {
  return value?.toLowerCase() ?? null;
}

export function getOutcomeBadge(callOutcome: string | null) {
  const category = getOutcomeCategory(callOutcome);
  return {
    category,
    label: getOutcomeLabel(callOutcome),
    tier: getOutcomeTier(category),
  };
}

export function getOutcomeFilterOptions(): Array<{
  value: OutcomeCategory;
  label: string;
}> {
  return (Object.keys(OUTCOME_CATEGORY_VALUES) as OutcomeCategory[]).map((key) => ({
    value: key,
    label: getOutcomeLabel(OUTCOME_CATEGORY_VALUES[key][0] ?? key),
  }));
}

/**
 * Format a call timestamp in the shop's resolved timezone (so the displayed
 * time matches the timezone the time-of-day filter evaluates against). Uses
 * Intl directly — no date-fns-tz dependency. Falls back to America/Los_Angeles
 * if the zone is missing or invalid, mirroring the SQL resolution's fallback.
 */
export function formatInClientTz(
  iso: string | null,
  tz: string | null,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  const zone = tz && tz.trim() ? tz : "America/Los_Angeles";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone, ...options }).format(
      new Date(iso),
    );
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      ...options,
    }).format(new Date(iso));
  }
}

// Shared Intl option presets so the table and detail view stay consistent.
export const CALL_TIME_FORMATS = {
  dateTime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true },
  date: { month: "short", day: "numeric" },
  dateYear: { month: "short", day: "numeric", year: "numeric" },
  time: { hour: "numeric", minute: "2-digit", hour12: true },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export function formatCallDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const wholeSeconds = Math.round(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function formatPhoneNumber(raw: number | string | null) {
  if (raw === null || raw === undefined) return "Unknown";
  const digits = String(raw).replace(/\D/g, "");
  const normalized = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return String(raw);
}
