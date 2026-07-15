import { requirePortalSession } from "@/lib/portal/session";
import { getCalls } from "@/app/(portal)/calls/actions";
import { CallsPageContent } from "@/app/(portal)/calls/calls-page-content";
import { getOutcomeFilterOptions } from "@/lib/calls";
import { filterEndedReasonOptions } from "@/lib/call-ended-reasons";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalSession({ page: "calls" });
  const supabase = await createServerSupabaseClient();
  const params = await searchParams;

  const str = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;

  const [
    callsResult,
    assistantsResult,
    endedReasonsResult,
    directionsResult,
    locationsResult,
  ] = await Promise.all([
      getCalls({
        companyId: session.membership.company_id,
        page: Number(str(params.page)) || 1,
        search: str(params.search),
        direction: str(params.direction),
        sentiment: str(params.sentiment),
        agent: str(params.agent),
        outcome: str(params.outcome),
        sortBy: str(params.sort),
        sortOrder: str(params.order),
        durationMin: str(params.duration_min),
        durationMax: str(params.duration_max),
        from: str(params.from),
        to: str(params.to),
        reviewedState: str(params.reviewed),
        endedReason: str(params.ended_reason),
        timeFrom: str(params.time_from),
        timeTo: str(params.time_to),
        locations: str(params.locations),
      }),
      supabase
        .from("assistants")
        .select("assistant_id, agent_name")
        .eq("company_id", session.membership.company_id)
        .order("agent_name"),
      supabase.rpc("get_portal_ended_reasons"),
      // Not in the generated DB types yet; read untyped (mirrors the
      // get_portal_calls cast convention). Drives Direction-filter auto-hide.
      supabase.rpc("get_portal_call_directions" as never),
      // Location options for the location filter. RLS scopes to the tenant; the
      // explicit company_id eq mirrors the assistants query for symmetry.
      supabase
        .from("locations")
        .select("id, location_name")
        .eq("company_id", session.membership.company_id)
        .order("location_name"),
    ]);

  const agents = (assistantsResult.data ?? [])
    .filter((agent) => agent.assistant_id && agent.agent_name)
    .map((agent) => ({
      value: agent.assistant_id,
      label: agent.agent_name as string,
    }));

  const presentEndedReasons = (endedReasonsResult.data ?? [])
    .map((row) => row.ended_reason)
    .filter((value): value is string => Boolean(value));
  const endedReasons = filterEndedReasonOptions(presentEndedReasons);

  const presentDirections = (
    ((directionsResult as { data: unknown }).data ?? []) as Array<{
      call_direction: string | null;
    }>
  )
    .map((row) => row.call_direction)
    .filter((value): value is string => Boolean(value));

  const locations = (locationsResult.data ?? [])
    .filter((row) => row.id && row.location_name)
    .map((row) => ({ id: row.id, name: row.location_name as string }));

  return (
    <CallsPageContent
      calls={callsResult.calls}
      total={callsResult.total}
      page={callsResult.page}
      perPage={callsResult.perPage}
      agents={agents}
      outcomes={getOutcomeFilterOptions()}
      endedReasons={endedReasons}
      directions={presentDirections}
      locations={locations}
    />
  );
}
