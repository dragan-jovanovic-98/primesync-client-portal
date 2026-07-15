import type { NextRequest } from "next/server";
import { getRoutePortalSession } from "@/lib/portal/route-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildRpcFilterArgs,
  type RpcFilterArgs,
} from "@/lib/calls-filters";
import {
  formatCallDuration,
  formatPhoneNumber,
  type CallLogFilters,
} from "@/lib/calls";
import { getOutcomeLabel } from "@/lib/call-outcomes";
import { getEndedReasonLabel } from "@/lib/call-ended-reasons";

const CHUNK_SIZE = 1000;

const HEADERS = [
  "call_id",
  "call_time",
  "direction",
  "from_number",
  "to_number",
  "duration",
  "duration_seconds",
  "outcome",
  "sentiment",
  "reviewed",
  "ended_reason",
  "agent_name",
  "location_name",
  "summary",
  "client_notes",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",") + "\n";
}

function buildFilename() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `torqi-calls-${stamp}.csv`;
}

type CallRow = {
  call_id: string;
  call_date: string | null;
  call_direction: string | null;
  phone_number: number | null;
  call_duration_s: number | null;
  call_outcome: string | null;
  user_sentiment: string | null;
  reviewed: boolean;
  ended_reason: string | null;
  agent_name: string | null;
  location_id: string | null;
  summary: string | null;
  total_count: number;
};

export async function GET(request: NextRequest) {
  const session = await getRoutePortalSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  const filters: CallLogFilters = {
    search: searchParams.get("search") ?? undefined,
    direction: searchParams.get("direction") ?? undefined,
    sentiment: searchParams.get("sentiment") ?? undefined,
    agent: searchParams.get("agent") ?? undefined,
    outcome: searchParams.get("outcome") ?? undefined,
    sortBy: searchParams.get("sort") ?? undefined,
    sortOrder: searchParams.get("order") ?? undefined,
    durationMin: searchParams.get("duration_min") ?? undefined,
    durationMax: searchParams.get("duration_max") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    reviewedState: searchParams.get("reviewed") ?? undefined,
    endedReason: searchParams.get("ended_reason") ?? undefined,
    timeFrom: searchParams.get("time_from") ?? undefined,
    timeTo: searchParams.get("time_to") ?? undefined,
    locations: searchParams.get("locations") ?? undefined,
  };

  const sortBy = filters.sortBy || "date";
  const rpcSortBy =
    sortBy === "duration"
      ? "duration"
      : sortBy === "sentiment"
        ? "sentiment"
        : "call_date";
  const rpcSortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

  const baseRpcArgs: RpcFilterArgs = buildRpcFilterArgs(
    filters,
    rpcSortBy,
    rpcSortOrder,
  );

  const supabase = await createServerSupabaseClient();

  // Hydrate a location-name lookup once up front. Calls have location_id but
  // the display name lives on the locations table.
  const { data: locationRows } = await supabase
    .from("locations")
    .select("id, location_name");
  const locationNameById = new Map<string, string>();
  for (const row of locationRows ?? []) {
    if (row.id && row.location_name) {
      locationNameById.set(row.id, row.location_name);
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        controller.enqueue(encoder.encode(csvRow(HEADERS)));

        let offset = 0;
        while (true) {
          if (request.signal.aborted) {
            controller.close();
            return;
          }

          const { data, error } = await supabase.rpc("get_portal_calls", {
            ...baseRpcArgs,
            p_limit: CHUNK_SIZE,
            p_offset: offset,
          });

          if (error) {
            console.error("[portal] export calls RPC error:", error);
            controller.enqueue(
              encoder.encode(
                csvRow(["ERROR", error.message, "", "", "", "", "", "", "", "", "", "", "", "", ""]),
              ),
            );
            controller.close();
            return;
          }

          const rows = (data ?? []) as unknown as CallRow[];
          if (rows.length === 0) break;

          // Fetch client_notes for this chunk in a single query. The list RPC
          // deliberately omits notes; the detail RPC returns them but we don't
          // want N+1. Company scope is enforced defensively even though the
          // call_ids are already proven to belong to this tenant via the RPC.
          const callIds = rows.map((row) => row.call_id);
          const { data: noteRows } = await supabase
            .from("all_client_calls")
            .select("call_id, client_notes")
            .in("call_id", callIds)
            .eq("company_id", session.companyId);
          const notesById = new Map<string, string>();
          for (const noteRow of noteRows ?? []) {
            if (noteRow.call_id && noteRow.client_notes) {
              notesById.set(noteRow.call_id, noteRow.client_notes);
            }
          }

          for (const row of rows) {
            const locationName = row.location_id
              ? (locationNameById.get(row.location_id) ?? "")
              : "";
            controller.enqueue(
              encoder.encode(
                csvRow([
                  row.call_id,
                  row.call_date ?? "",
                  row.call_direction ?? "",
                  formatPhoneNumber(row.phone_number),
                  "", // to_number — not tracked separately today; reserved column
                  formatCallDuration(row.call_duration_s),
                  row.call_duration_s ?? "",
                  getOutcomeLabel(row.call_outcome),
                  row.user_sentiment ?? "",
                  row.reviewed ? "yes" : "no",
                  getEndedReasonLabel(row.ended_reason),
                  row.agent_name ?? "",
                  locationName,
                  row.summary ?? "",
                  notesById.get(row.call_id) ?? "",
                ]),
              ),
            );
          }

          if (rows.length < CHUNK_SIZE) break;
          offset += CHUNK_SIZE;
        }

        controller.close();
      } catch (err) {
        console.error("[portal] export calls stream error:", err);
        try {
          controller.error(err);
        } catch {
          // controller may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
