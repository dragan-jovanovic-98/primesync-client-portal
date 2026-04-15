import { requirePortalSession } from "@/lib/portal/session";
import { getCalls } from "@/app/(portal)/calls/actions";
import { CallsPageContent } from "@/app/(portal)/calls/calls-page-content";
import { getOutcomeFilterOptions } from "@/lib/calls";
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

  const [callsResult, assistantsResult] = await Promise.all([
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
      hours: str(params.hours),
      from: str(params.from),
      to: str(params.to),
      reviewedState: str(params.reviewed),
    }),
    supabase
      .from("assistants")
      .select("assistant_id, agent_name")
      .eq("company_id", session.membership.company_id)
      .order("agent_name"),
  ]);

  const agents = (assistantsResult.data ?? [])
    .filter((agent) => agent.assistant_id && agent.agent_name)
    .map((agent) => ({
      value: agent.assistant_id,
      label: agent.agent_name as string,
    }));

  return (
    <CallsPageContent
      calls={callsResult.calls}
      total={callsResult.total}
      page={callsResult.page}
      perPage={callsResult.perPage}
      agents={agents}
      outcomes={getOutcomeFilterOptions()}
    />
  );
}
