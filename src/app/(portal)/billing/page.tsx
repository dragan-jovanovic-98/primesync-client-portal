import { requirePortalSession } from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BillingPageContent } from "./billing-content";
import { getBillingData, getPortalUsage } from "./actions";
import type { UsageFilterOption } from "@/components/billing/usage-filters";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalSession({ page: "billing" });
  const params = await searchParams;
  const str = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;

  const tab = str(params.tab) === "usage" ? "usage" : "overview";

  const data = await getBillingData(session.membership.company_id);

  let usageResult = null;
  let agentOptions: UsageFilterOption[] = [];
  let locationOptions: UsageFilterOption[] = [];

  if (tab === "usage") {
    const supabase = await createServerSupabaseClient();
    const agentParam = str(params.agent);
    const locationParam = str(params.location);
    const assistantIds = agentParam ? agentParam.split(",").filter(Boolean) : [];
    const locationIds = locationParam
      ? locationParam.split(",").filter(Boolean)
      : [];

    const [usage, assistantsRes, locationsRes] = await Promise.all([
      getPortalUsage({
        from: str(params.from),
        to: str(params.to),
        assistantIds,
        locationIds,
        page: Number(str(params.page)) || 1,
        perPage: 25,
      }),
      supabase
        .from("assistants")
        .select("assistant_id, agent_name, status")
        .eq("company_id", session.membership.company_id)
        .eq("status", true)
        .order("agent_name"),
      supabase
        .from("locations")
        .select("id, location_name")
        .eq("company_id", session.membership.company_id)
        .order("location_name"),
    ]);

    usageResult = usage;
    agentOptions = (assistantsRes.data ?? [])
      .filter(
        (row): row is { assistant_id: string; agent_name: string; status: boolean } =>
          Boolean(row.assistant_id && row.agent_name),
      )
      .map((row) => ({ id: row.assistant_id, label: row.agent_name }));
    locationOptions = (locationsRes.data ?? [])
      .filter(
        (row): row is { id: string; location_name: string } =>
          Boolean(row.id && row.location_name),
      )
      .map((row) => ({ id: row.id, label: row.location_name }));
  }

  // Rebuild the search params string for pagination links in the usage table.
  const searchParamsString = new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([k, v]) => [k, v as string]),
  ).toString();

  return (
    <BillingPageContent
      data={data}
      tab={tab}
      usageResult={usageResult}
      agentOptions={agentOptions}
      locationOptions={locationOptions}
      pathname="/billing"
      searchParamsString={searchParamsString}
    />
  );
}
