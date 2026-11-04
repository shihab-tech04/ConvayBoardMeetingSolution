import { useCallback, startTransition } from "react";
import { useNavigate } from "react-router";
import { useNotificationsState } from "./useNotificationsState";
import { notificationDestinationPath } from "../services/supabase/convayNotifications";
import type { Notification } from "../store/notificationsSlice";

// Re-export for backwards compatibility.
export type { Notification };

export function useNotifications(
  _onNavigate?: (destination: { main: string; sub?: string; third?: string }) => void
) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, loading, error, reload } =
    useNotificationsState();

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      void markRead(notification.id);
      startTransition(() => navigate(notificationDestinationPath(notification.destination)));
    },
    [markRead, navigate]
  );

  const handleMarkAllRead = useCallback(() => {
    void markAllRead();
  }, [markAllRead]);

  return {
    notifications,
    unreadCount,
    loading, error, reload,
    handleNotificationClick,
    handleMarkAllRead,
  };
}
