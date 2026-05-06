import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/portal/session";
import {
  getPortalNotificationFeed,
  type PortalNotification,
} from "@/app/(portal)/notifications/actions";
import { NotificationsListClient } from "@/app/(portal)/notifications/notifications-list-client";

const PAGE_SIZE = 50;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePortalSession({ page: "notifications" });

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const pageNum = Math.max(1, Number(params.page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const feed = await getPortalNotificationFeed(PAGE_SIZE, offset);
  const totalPages = Math.max(1, Math.ceil(feed.totalCount / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#242529]">
          Notifications
        </h1>
        <p className="mt-0.5 text-[14px] text-[rgba(0,0,0,0.7)]">
          {feed.totalCount === 0
            ? "You don't have any notifications yet."
            : feed.unreadCount > 0
              ? `${feed.unreadCount} unread · ${feed.totalCount} total`
              : `${feed.totalCount} total`}
        </p>
      </div>

      <NotificationsListClient
        initialNotifications={feed.notifications}
        initialUnreadCount={feed.unreadCount}
        page={pageNum}
        totalPages={totalPages}
      />
    </div>
  );
}

export type { PortalNotification };
