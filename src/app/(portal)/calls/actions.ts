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
} from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCalls(filters: CallLogFilters): Promise<CallLogResult> {
  noStore();
  await requirePortalAction({
    capability: "calls.read",
    page: "calls",
  });
  const supabase = await createServerSupabaseClient();

  const page = filters.page || 1;
  const perPage = filters.perPage || 25;
  const offset = (page - 1) * perPage;
  const sortBy = filters.sortBy || "date";
  const sortOrder = filters.sortOrder || "desc";

  // Map UI sort key to RPC sort key. The UI uses "date" as a label; the RPC
  // uses "call_date". Duration and sentiment names line up.
  const rpcSortBy =
    sortBy === "duration"
      ? "duration"
      : sortBy === "sentiment"
        ? "sentiment"
        : "call_date";
  const rpcSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const rpcArgs = buildRpcFilterArgs(filters, rpcSortBy, rpcSortOrder);

  // Business-hours classification is computed in SQL by the RPC. The hours
  // filter (p_hours) is applied server-side, and is_business_hours comes back
  // as a column per row — no JS hydration or 5,000-row fallback needed. The
  // generated Supabase types don't yet know about the new column/param, so
  // cast the RPC rows to the richer shape.
  const { data, error } = await supabase.rpc("get_portal_calls", {
    ...rpcArgs,
    p_limit: perPage,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<
    CallLog & { total_count: number; is_business_hours: boolean | null }
  >;
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const calls = rows.map(({ total_count: _total, is_business_hours, ...row }) => ({
    ...row,
    isBusinessHours: is_business_hours ?? null,
  }));

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
