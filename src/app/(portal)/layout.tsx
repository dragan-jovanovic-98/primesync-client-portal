import { redirect } from "next/navigation";
import { getPortalNotificationFeed } from "@/app/(portal)/notifications/actions";
import { getStaleDocumentTypes } from "@/lib/legal/consents";
import { requirePortalSession } from "@/lib/portal/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalProvider } from "@/components/providers/portal-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ReconsentBanner } from "@/components/billing/reconsent-banner";

/**
 * Determines whether the persistent re-consent banner should render for the
 * current admin portal user. Banner shows when:
 *   - The user is an admin (only admins can manage billing; staff don't see it)
 *   - The client's stripe_account is 'legacy' (not yet migrated to TorQi)
 *   - The client has not yet completed re-consent (torqi_consent_at IS NULL)
 *
 * Returns false on any error or missing data — banner stays hidden if we can't
 * confirm it should be shown. Better silent than spurious.
 */
async function shouldShowReconsentBanner(
  companyId: string,
  role: string,
): Promise<boolean> {
  if (role !== "admin") return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("stripe_account, torqi_consent_at")
    .eq("company_id", companyId)
    .maybeSingle<{
      stripe_account: "legacy" | "primary";
      torqi_consent_at: string | null;
    }>();

  if (!data) return false;
  return data.stripe_account === "legacy" && data.torqi_consent_at === null;
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSession();

  // Legal-document version-bump gate. If the signed-in user has not accepted
  // the current LEGAL_VERSIONS for ToS or Privacy, block portal access until
  // they re-accept on /accept-updates. The interstitial route lives outside
  // the (portal) group, so this check does not recurse.
  const staleDocs = await getStaleDocumentTypes(session.membership.id);
  if (staleDocs.length > 0) {
    redirect("/accept-updates");
  }

  // Fetch the initial notification feed for admin sessions only. Staff users
  // don't see the bell at all, so there's no reason to run the RPC for them.
  const notificationFeed =
    session.role === "admin"
      ? await getPortalNotificationFeed(10, 0)
      : { notifications: [], totalCount: 0, unreadCount: 0 };

  const showReconsentBanner = await shouldShowReconsentBanner(
    session.membership.company_id,
    session.role,
  );

  return (
    <PortalProvider
      companyId={session.membership.company_id}
      email={session.membership.email}
      fullName={session.membership.full_name}
      role={session.role}
    >
      <SidebarProvider>
        <div className="flex h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header
              initialNotifications={notificationFeed.notifications}
              initialUnreadCount={notificationFeed.unreadCount}
            />
            {showReconsentBanner && <ReconsentBanner />}
            <main className="flex-1 overflow-auto bg-[#faf8f5] px-4 py-6 sm:px-8">
              <div className="mx-auto min-w-0 max-w-[1280px]">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PortalProvider>
  );
}
