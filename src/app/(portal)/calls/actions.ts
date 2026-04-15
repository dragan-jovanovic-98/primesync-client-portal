"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { buildRpcFilterArgs } from "@/lib/calls-filters";
import type {
  CallLog,
  CallLogDetail,
  CallLogFilters,
  CallLogResult,
} from "@/lib/calls";
import {
  requirePortalAction,
  requirePortalSession,
} from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
};

type AssistantLocationRow = {
  assistant_id: string;
  location_id: string | null;
};

type LocationClosureRow = {
  location_id: string;
  closure_date: string;
  recurring: boolean;
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
// Cap the wide-window fetch used by the hours filter so memory stays bounded
// for clients with very large call histories.
const HOURS_FILTER_MAX_ROWS = 5000;


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
  const weekdayRaw =
    parts.find((part) => part.type === "weekday")?.value?.slice(0, 3).toLowerCase() ??
    "mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const weekdayKey = (
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(weekdayRaw)
      ? weekdayRaw
      : "mon"
  ) as keyof BusinessHoursSchedule;

  return {
    weekdayKey,
    minutes: hour * 60 + minute,
    monthDay: `${month}-${day}`,
    dateKey: `${year}-${month}-${day}`,
  };
}

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function isLocationClosed(
  localParts: LocalDateParts,
  closures: LocationClosureRow[],
) {
  return closures.some((closure) =>
    closure.recurring
      ? closure.closure_date.slice(5, 10) === localParts.monthDay
      : closure.closure_date === localParts.dateKey,
  );
}

function isWithinBusinessHours(
  call: CallLog,
  companyTimeZone: string,
  assistantLocations: Map<string, string>,
  locations: Map<string, LocationRow>,
  closuresByLocation: Map<string, LocationClosureRow[]>,
) {
  if (!call.call_date) return null;

  const resolvedLocationId =
    call.location_id ??
    (call.assistant_id ? assistantLocations.get(call.assistant_id) : undefined);
  const location = resolvedLocationId ? locations.get(resolvedLocationId) : undefined;
  const timeZone = location?.timezone || companyTimeZone || FALLBACK_TIME_ZONE;
  const localParts = getLocalDateParts(call.call_date, timeZone);

  if (!location || !resolvedLocationId) {
    return (
      localParts.minutes >= FALLBACK_OPEN_MINUTES &&
      localParts.minutes < FALLBACK_CLOSE_MINUTES
    );
  }

  const closures = closuresByLocation.get(resolvedLocationId) ?? [];
  if (isLocationClosed(localParts, closures)) return false;

  const daySchedule = location.business_hours?.[localParts.weekdayKey];
  if (!daySchedule?.open || !daySchedule?.close) {
    return (
      localParts.minutes >= FALLBACK_OPEN_MINUTES &&
      localParts.minutes < FALLBACK_CLOSE_MINUTES
    );
  }

  const openMinutes = parseTimeToMinutes(daySchedule.open);
  const closeMinutes = parseTimeToMinutes(daySchedule.close);
  if (openMinutes === null || closeMinutes === null) {
    return (
      localParts.minutes >= FALLBACK_OPEN_MINUTES &&
      localParts.minutes < FALLBACK_CLOSE_MINUTES
    );
  }

  if (openMinutes === closeMinutes) return true;
  if (openMinutes < closeMinutes) {
    return localParts.minutes >= openMinutes && localParts.minutes < closeMinutes;
  }

  return localParts.minutes >= openMinutes || localParts.minutes < closeMinutes;
}

function sentimentSortKey(value: string | null) {
  if (!value) return 0;
  const normalized = value.toLowerCase();
  if (normalized === "positive") return 1;
  if (normalized === "negative") return -1;
  return 0;
}

function sortCalls(
  calls: Array<CallLog & { isBusinessHours: boolean | null }>,
  sortBy: string,
  sortOrder: string,
) {
  const ascending = sortOrder === "asc";
  const multiplier = ascending ? 1 : -1;

  return [...calls].sort((a, b) => {
    if (sortBy === "duration") {
      return ((a.call_duration_s ?? 0) - (b.call_duration_s ?? 0)) * multiplier;
    }

    if (sortBy === "sentiment") {
      return (
        (sentimentSortKey(a.user_sentiment) - sentimentSortKey(b.user_sentiment)) *
        multiplier
      );
    }

    return (
      (new Date(a.call_date ?? 0).getTime() - new Date(b.call_date ?? 0).getTime()) *
      multiplier
    );
  });
}


async function fetchHydrationContext(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, companyId: string) {
  const [
    { data: clientRow },
    { data: assistantRows },
    { data: locationRows },
    { data: locationClosures },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("timezone")
      .eq("company_id", companyId)
      .maybeSingle<{ timezone: string | null }>(),
    supabase
      .from("assistants")
      .select("assistant_id, location_id")
      .eq("company_id", companyId)
      .returns<AssistantLocationRow[]>(),
    supabase
      .from("locations")
      .select("id, timezone, business_hours")
      .eq("company_id", companyId)
      .returns<LocationRow[]>(),
    supabase
      .from("location_closures")
      .select("location_id, closure_date, recurring")
      .returns<LocationClosureRow[]>(),
  ]);

  const companyTimeZone = clientRow?.timezone || FALLBACK_TIME_ZONE;
  const assistantLocations = new Map(
    (assistantRows ?? [])
      .filter(
        (row): row is AssistantLocationRow & { location_id: string } =>
          Boolean(row.assistant_id && row.location_id),
      )
      .map((row) => [row.assistant_id, row.location_id]),
  );
  const locations = new Map(
    (locationRows ?? []).map((location) => [location.id, location]),
  );
  const locationIds = new Set((locationRows ?? []).map((location) => location.id));
  const closuresByLocation = new Map<string, LocationClosureRow[]>();
  for (const closure of locationClosures ?? []) {
    if (!locationIds.has(closure.location_id)) continue;
    const existing = closuresByLocation.get(closure.location_id) ?? [];
    existing.push(closure);
    closuresByLocation.set(closure.location_id, existing);
  }

  return { companyTimeZone, assistantLocations, locations, closuresByLocation };
}

export async function getCalls(filters: CallLogFilters): Promise<CallLogResult> {
  noStore();
  const session = await requirePortalAction({
    capability: "calls.read",
    page: "calls",
  });
  const supabase = await createServerSupabaseClient();

  const page = filters.page || 1;
  const perPage = filters.perPage || 20;
  const offset = (page - 1) * perPage;
  const sortBy = filters.sortBy || "date";
  const sortOrder = filters.sortOrder || "desc";
  const needsHoursFilter = filters.hours === "business" || filters.hours === "after";

  // Map UI sort key to RPC sort key. The UI uses "date" as a label; the RPC
  // uses "call_date". Duration and sentiment names line up.
  const rpcSortBy =
    sortBy === "duration"
      ? "duration"
      : sortBy === "sentiment"
        ? "sentiment"
        : "call_date";
  const rpcSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const baseRpcArgs = buildRpcFilterArgs(filters, rpcSortBy, rpcSortOrder);

  // Always fetch the per-location hydration context: even when no hours filter
  // is set, the row hydration preserves parity with the previous behavior so
  // any future surface that wants to read isBusinessHours sees consistent data.
  const hydrationContext = await fetchHydrationContext(
    supabase,
    session.membership.company_id,
  );

  if (needsHoursFilter) {
    // Hours filter path: fetch a wide window from the RPC, hydrate per-location
    // business hours in TS, filter, sort, and paginate locally. The previous
    // implementation did the same — we preserve it.
    const { data, error } = await supabase.rpc("get_portal_calls", {
      ...baseRpcArgs,
      p_limit: HOURS_FILTER_MAX_ROWS,
      p_offset: 0,
    });
    if (error) throw error;

    const rows = (data ?? []).map(({ total_count: _total, ...row }) =>
      row as unknown as CallLog,
    );
    const hydrated = rows.map((call) => ({
      ...call,
      isBusinessHours: isWithinBusinessHours(
        call,
        hydrationContext.companyTimeZone,
        hydrationContext.assistantLocations,
        hydrationContext.locations,
        hydrationContext.closuresByLocation,
      ),
    }));
    const filtered = hydrated.filter((call) =>
      filters.hours === "business"
        ? call.isBusinessHours === true
        : call.isBusinessHours === false,
    );
    const sorted = sortCalls(filtered, sortBy, sortOrder);
    const paged = sorted.slice(offset, offset + perPage);

    return {
      calls: paged,
      total: filtered.length,
      page,
      perPage,
    };
  }

  // Fast path: no hours filter — let the RPC paginate and sort.
  const { data, error } = await supabase.rpc("get_portal_calls", {
    ...baseRpcArgs,
    p_limit: perPage,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = data ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const calls = rows.map(({ total_count: _total, ...row }) => {
    const callRow = row as unknown as CallLog;
    return {
      ...callRow,
      isBusinessHours: isWithinBusinessHours(
        callRow,
        hydrationContext.companyTimeZone,
        hydrationContext.assistantLocations,
        hydrationContext.locations,
        hydrationContext.closuresByLocation,
      ),
    };
  });

  return {
    calls,
    total,
    page,
    perPage,
  };
}

export async function getCallById(callId: string): Promise<CallLogDetail | null> {
  noStore();
  await requirePortalAction({ capability: "calls.read", page: "calls" });
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_portal_call", {
    p_call_id: callId,
  });

  if (error) {
    // The RPC raises P0002 ("call not found") for cross-company or unknown
    // call_ids. Treat as null so the page can render notFound().
    const message = error.message ?? "";
    if (message.includes("call not found")) {
      return null;
    }
    throw error;
  }

  return data ?? null;
}

export async function setCallReviewed(
  callId: string,
  reviewed: boolean,
): Promise<CallLogDetail> {
  await requirePortalAction({
    capability: "calls.write_review",
    page: "calls",
  });
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("set_call_reviewed", {
    p_call_id: callId,
    p_reviewed: reviewed,
  });
  if (error) throw error;
  if (!data) throw new Error("call not found");

  revalidatePath(`/calls/${encodeURIComponent(callId)}`);
  revalidatePath("/calls");
  return data;
}

export async function setCallNotes(
  callId: string,
  notes: string,
): Promise<CallLogDetail> {
  await requirePortalAction({
    capability: "calls.write_review",
    page: "calls",
  });
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("set_call_notes", {
    p_call_id: callId,
    p_notes: notes,
  });
  if (error) throw error;
  if (!data) throw new Error("call not found");

  revalidatePath(`/calls/${encodeURIComponent(callId)}`);
  return data;
}
