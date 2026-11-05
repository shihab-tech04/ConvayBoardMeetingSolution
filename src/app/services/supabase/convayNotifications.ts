import type { Notification, NotificationPriority, NotificationType } from "../../data/mockData";
import { convayAuth } from "./convayAuth";

export interface StoredNotification {
  id: string;
  recipient_user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  module: string;
  destination: Notification["destination"];
  is_read: boolean;
  created_at: string;
}

const SELECT_FIELDS = "id,recipient_user_id,type,priority,title,message,module,destination,is_read,created_at";
const PAGE_SIZE = 200;

/** Authenticated, RLS-scoped notification reads. Never silently truncate at a PostgREST row limit. */
export async function listPersonalNotifications(recipientUserId: string): Promise<Notification[]> {
  if (!recipientUserId) throw new Error("A signed-in user is required to read notifications.");
  const result: Notification[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const path = "/rest/v1/convay_user_notifications?select=" + SELECT_FIELDS
      + "&recipient_user_id=eq." + encodeURIComponent(recipientUserId)
      + "&order=created_at.desc,id.desc&limit=" + PAGE_SIZE + "&offset=" + offset;
    const response = await convayAuth.authenticatedRequest(path);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid notification response");
    const rows = data as StoredNotification[];
    for (const row of rows) {
      // A request may outlive a session switch; validate owner, not just RLS.
      if (row.recipient_user_id !== recipientUserId) {
        throw new Error("Notification ownership changed. Please reload your inbox.");
      }
      result.push({
        id: row.id,
        type: row.type,
        priority: row.priority,
        title: row.title,
        message: row.message,
        module: row.module,
        time: new Date(row.created_at).toLocaleString(),
        isRead: row.is_read,
        destination: row.destination,
      });
    }
    if (rows.length < PAGE_SIZE) return result;
  }
}

/** Column-level SQL grant allows users to change only their own is_read flag. */
export async function persistNotificationRead(id: string, recipientUserId: string): Promise<void> {
  if (!recipientUserId) throw new Error("A signed-in user is required to update notifications.");
  const url = "/rest/v1/convay_user_notifications?id=eq." + encodeURIComponent(id)
    + "&recipient_user_id=eq." + encodeURIComponent(recipientUserId) + "&select=id";
  const response = await convayAuth.authenticatedRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ is_read: true }),
  });
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.id !== id) {
    throw new Error("Notification is no longer accessible. Refresh your inbox.");
  }
}

export async function persistAllNotificationsRead(recipientUserId: string): Promise<void> {
  if (!recipientUserId) throw new Error("A signed-in user is required to update notifications.");
  await convayAuth.authenticatedRequest(
    "/rest/v1/convay_user_notifications?is_read=eq.false&recipient_user_id=eq." + encodeURIComponent(recipientUserId), {

    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ is_read: true }),
  });
}

/** Navigation is restricted to existing internal app roots; never trust arbitrary URLs from records. */
export function notificationDestinationPath(destination: Notification["destination"]): string {
  const allowed = new Set([
    "home", "meetings", "agenda-documents", "decisions-followup",
    "governance-org", "archive-reports", "administration",
  ]);
  if (!destination || !allowed.has(destination.main)) return "/home/notifications";
  const segments = [destination.main, destination.sub, destination.third].filter(Boolean);
  if (segments.some(segment => !/^[a-z0-9-]+$/i.test(String(segment)))) {
    return "/home/notifications";
  }
  return "/" + segments.join("/");
}
