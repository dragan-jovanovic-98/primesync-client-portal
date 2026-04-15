import { getPortalNotificationFeed } from "@/app/(portal)/notifications/actions";
import { requirePortalSession } from "@/lib/portal/session";
import { PortalProvider } from "@/components/providers/portal-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSession();

  // Fetch the initial notification feed for admin sessions only. Staff users
  // don't see the bell at all, so there's no reason to run the RPC for them.
  const notificationFeed =
    session.role === "admin"
      ? await getPortalNotificationFeed(10, 0)
      : { notifications: [], totalCount: 0, unreadCount: 0 };

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
            <main className="flex-1 overflow-auto bg-white px-4 py-6 sm:px-8">
              <div className="mx-auto min-w-0 max-w-[1280px]">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PortalProvider>
  );
}
