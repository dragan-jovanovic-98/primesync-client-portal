import { unstable_noStore as noStore } from "next/cache";
import { getDashboardData } from "@/app/(portal)/dashboard/actions";
import { DashboardContent } from "@/app/(portal)/dashboard/dashboard-content";
import { requirePortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const session = await requirePortalSession({ page: "dashboard" });
  const firstName = session.membership.full_name?.split(" ")[0] ?? "there";

  const resolvedSearchParams = await searchParams;
  const urlSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      urlSearchParams.set(key, value);
    }
  }
  const debug = resolvedSearchParams.debug === "1";

  const dashboardData = await getDashboardData(
    session.membership.company_id,
    urlSearchParams,
  );
  const dashboardViewKey = urlSearchParams.toString() || "default";

  return (
    <DashboardContent
      key={dashboardViewKey}
      firstName={firstName}
      activeAgents={dashboardData.activeAgents}
      dashboardData={dashboardData}
      debug={debug}
    />
  );
}
