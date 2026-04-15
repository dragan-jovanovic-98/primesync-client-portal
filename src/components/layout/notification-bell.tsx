"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markAllPortalNotificationsRead,
  markPortalNotificationRead,
  type PortalNotification,
} from "@/app/(portal)/notifications/actions";

interface NotificationBellProps {
  initialNotifications: PortalNotification[];
  initialUnreadCount: number;
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<PortalNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Resync with props when the layout refetches (e.g. on navigation).
  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleItemClick(notification: PortalNotification) {
    // Optimistic mark-read
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      startTransition(async () => {
        await markPortalNotificationRead(notification.id);
      });
    }
    setOpen(false);
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

  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-md text-[rgba(0,0,0,0.55)] transition-colors",
          "hover:bg-[#eeeff1] hover:text-[#242529]",
          open && "bg-[#eeeff1] text-[#242529]",
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-[3px] text-[9px] font-semibold leading-none text-white">
            {badgeText}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[340px] overflow-hidden rounded-lg border border-[#eeeff1] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-[#eeeff1] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[#242529]">
                Notifications
              </p>
              {unreadCount > 0 ? (
                <p className="text-[11px] text-zinc-500">
                  {unreadCount} unread
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500">You&apos;re caught up</p>
              )}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[12px] font-medium text-[#525866] transition-colors hover:text-[#242529] disabled:opacity-50"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-zinc-500">
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#eeeff1]">
                {notifications.slice(0, 10).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={cn(
                        "block w-full px-4 py-3 text-left transition-colors hover:bg-[#fbfbfb]",
                        !n.read && "bg-[#f5f7fa]",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read ? (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                        ) : (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-transparent" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#242529]">
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-zinc-600">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-400">
                            {formatDistanceToNow(new Date(n.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#eeeff1] px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-[12px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
            >
              See all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
