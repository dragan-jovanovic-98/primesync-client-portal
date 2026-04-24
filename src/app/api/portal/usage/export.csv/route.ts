import type { NextRequest } from "next/server";
import { getRoutePortalSession } from "@/lib/portal/route-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatBillingCurrency } from "@/lib/billing";

const CHUNK_SIZE = 1000;

const HEADERS = [
  "call_id",
  "call_time",
  "duration_seconds",
  "duration_formatted",
  "client_cost",
  "client_cost_raw",
  "agent_name",
  "location_name",
  "outcome",
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
  return `torqi-usage-${stamp}.csv`;
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "";
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

type UsageRpcRow = {
  call_id: string;
  call_date: string | null;
  call_duration_s: number | null;
  total_cost_client: number | string | null;
  assistant_id: string | null;
  agent_name: string | null;
  location_id: string | null;
  location_name: string | null;
  call_outcome: string | null;
  total_count: number;
};

export async function GET(request: NextRequest) {
  const session = await getRoutePortalSession();
  if (!session || session.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const agentParam = searchParams.get("agent");
  const locationParam = searchParams.get("location");

  const assistantIds = agentParam ? agentParam.split(",").filter(Boolean) : [];
  const locationIds = locationParam
    ? locationParam.split(",").filter(Boolean)
    : [];

  const supabase = await createServerSupabaseClient();

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

          const { data, error } = await supabase.rpc("get_portal_usage", {
            p_from: from ? `${from}T00:00:00` : undefined,
            p_to: to ? `${to}T23:59:59.999` : undefined,
            p_assistant_ids:
              assistantIds.length > 0 ? assistantIds : undefined,
            p_location_ids: locationIds.length > 0 ? locationIds : undefined,
            p_limit: CHUNK_SIZE,
            p_offset: offset,
          });

          if (error) {
            console.error("[portal] usage export RPC error:", error);
            controller.close();
            return;
          }

          const rows = (data ?? []) as unknown as UsageRpcRow[];
          if (rows.length === 0) break;

          for (const row of rows) {
            const rawCost =
              row.total_cost_client === null || row.total_cost_client === undefined
                ? null
                : Number(row.total_cost_client);
            const formattedCost =
              rawCost === null
                ? "Included"
                : rawCost === 0
                  ? "Included"
                  : formatBillingCurrency(rawCost);
            controller.enqueue(
              encoder.encode(
                csvRow([
                  row.call_id,
                  row.call_date ?? "",
                  row.call_duration_s ?? "",
                  formatDuration(row.call_duration_s),
                  formattedCost,
                  rawCost ?? "",
                  row.agent_name ?? "",
                  row.location_name ?? "",
                  row.call_outcome ?? "",
                ]),
              ),
            );
          }

          if (rows.length < CHUNK_SIZE) break;
          offset += CHUNK_SIZE;
        }

        controller.close();
      } catch (err) {
        console.error("[portal] usage export stream error:", err);
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
