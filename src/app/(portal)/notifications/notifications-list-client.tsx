"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markAllPortalNotificationsRead,
  markPortalNotificationRead,
  type PortalNotification,
} from "@/app/(portal)/notifications/actions";

interface NotificationsListClientProps {
  initialNotifications: PortalNotification[];
  initialUnreadCount: number;
  page: number;
  totalPages: number;
}

function groupByDay(notifications: PortalNotification[]) {
  const groups = new Map<string, PortalNotification[]>();
  for (const n of notifications) {
    const dayKey = format(new Date(n.createdAt), "yyyy-MM-dd");
    const existing = groups.get(dayKey) ?? [];
    existing.push(n);
    groups.set(dayKey, existing);
  }
  return Array.from(groups.entries()).map(([dayKey, items]) => ({
    dayKey,
    label: format(new Date(`${dayKey}T00:00:00`), "EEEE, MMM d"),
    items,
  }));
}

export function NotificationsListClient({
  initialNotifications,
  initialUnreadCount,
  page,
  totalPages,
}: NotificationsListClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<PortalNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();

  function handleClick(notification: PortalNotification) {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      startTransition(async () => {
        await markPortalNotificationRead(notification.id);
      });
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    startTransition(async () => {
      await markAllPortalNotificationsRead();
    });
  }

  const groups = groupByDay(notifications);

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-center justify-between border-b border-[#eeeff1] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242529]">
            Recent activity
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">
            Billing events and account updates
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="h-8 rounded-lg border border-[#e5e5e5] px-3 text-[12.5px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa] disabled:opacity-50"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f7fa] text-zinc-400">
            <Bell className="h-5 w-5" />
          </div>
          <p className="text-[14px] font-medium text-[#242529]">
            No notifications yet
          </p>
          <p className="max-w-xs text-[13px] text-zinc-500">
            When billing events or account updates happen, they&apos;ll appear
            here.
          </p>
        </div>
      ) : (
        <div>
          {groups.map((group) => (
            <div key={group.dayKey}>
              <div className="border-b border-[#eeeff1] bg-[#fbfbfb] px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {group.label}
              </div>
              <ul className="divide-y divide-[#eeeff1]">
                {group.items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[#fbfbfb]",
                        !n.read && "bg-[#f5f7fa]/60",
                      )}
                    >
                      {!n.read ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#242529]">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-[13px] text-zinc-600">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-[#eeeff1] px-5 py-3">
              <span className="text-[12px] text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  href={page > 1 ? `/notifications?page=${page - 1}` : "#"}
                  aria-disabled={page <= 1}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded-lg border border-[#e5e5e5] px-2.5 text-[12.5px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa]",
                    page <= 1 && "pointer-events-none opacity-40",
                  )}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Link>
                <Link
                  href={
                    page < totalPages
                      ? `/notifications?page=${page + 1}`
                      : "#"
                  }
                  aria-disabled={page >= totalPages}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded-lg border border-[#e5e5e5] px-2.5 text-[12.5px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa]",
                    page >= totalPages && "pointer-events-none opacity-40",
                  )}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
