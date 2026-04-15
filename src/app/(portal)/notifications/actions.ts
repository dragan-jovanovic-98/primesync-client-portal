"use server";

import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import {
  requirePortalAction,
  requirePortalSession,
} from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PortalNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type PortalNotificationFeed = {
  notifications: PortalNotification[];
  totalCount: number;
  unreadCount: number;
};

type RpcRow = {
  id: string;
  company_id: string;
  portal_user_id: string | null;
  type: string;
  title: string;
  message: string;
  call_id: string | null;
  is_read: boolean;
  metadata: { link?: string } | null;
  created_at: string;
  total_count: number;
  unread_count: number;
};

function mapRow(row: RpcRow): PortalNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.metadata?.link ?? null,
    read: row.is_read,
    createdAt: row.created_at,
  };
}

export async function getPortalNotificationFeed(
  limit = 20,
  offset = 0,
): Promise<PortalNotificationFeed> {
  noStore();
  const session = await requirePortalSession();

  // Feed is admin-only. The RPC enforces this too via is_portal_admin() — the
  // role check here just avoids calling the RPC for staff sessions at all.
  if (session.role !== "admin") {
    return { notifications: [], totalCount: 0, unreadCount: 0 };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_portal_notifications", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("[portal] get_portal_notifications failed:", error);
    return { notifications: [], totalCount: 0, unreadCount: 0 };
  }

  const rows = (data ?? []) as unknown as RpcRow[];
  if (rows.length === 0) {
    return { notifications: [], totalCount: 0, unreadCount: 0 };
  }

  return {
    notifications: rows.map(mapRow),
    totalCount: Number(rows[0].total_count ?? 0),
    unreadCount: Number(rows[0].unread_count ?? 0),
  };
}

export async function markPortalNotificationRead(notificationId: string) {
  await requirePortalAction({ capability: "notifications.mark_read" });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("mark_portal_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) {
    console.error("[portal] mark_portal_notification_read failed:", error);
    return { ok: false };
  }

  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllPortalNotificationsRead() {
  await requirePortalAction({ capability: "notifications.mark_read" });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("mark_all_portal_notifications_read");

  if (error) {
    console.error("[portal] mark_all_portal_notifications_read failed:", error);
    return { ok: false };
  }

  revalidatePath("/notifications");
  return { ok: true };
}
