import { useCallback, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import type { RootState, AppDispatch } from "../store/store";
import {
  markNotificationRead, markAllNotificationsRead, setNotifications,
} from "../store/notificationsSlice";
import type { Notification } from "../store/notificationsSlice";
import {
  listPersonalNotifications, persistNotificationRead, persistAllNotificationsRead,
} from "../services/supabase/convayNotifications";

/** The topbar, mobile topbar and inbox share the authoritative server-backed store. */
export function useNotificationsState() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.notifications.items);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userId = useSelector((state: RootState) => state.currentUser.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      dispatch(setNotifications([]));
      setError(null);
      return;
    }
    // Test-mode fixtures are never imported into the production database.
    if (import.meta.env.MODE === "test") return;
    setLoading(true);
    setError(null);
    try {
      const records = await listPersonalNotifications();
      dispatch(setNotifications(records));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Notifications could not be loaded";
      setError(message);
      dispatch(setNotifications([]));
    } finally {
      setLoading(false);
    }
  }, [dispatch, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      dispatch(setNotifications([]));
      setError(null);
      return;
    }
    void reload();
  }, [dispatch, isAuthenticated, userId, reload]);

  const markRead = useCallback(async (id: string) => {
    try {
      await persistNotificationRead(id);
      dispatch(markNotificationRead(id));
      return true;
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to mark notification as read");
      return false;
    }
  }, [dispatch]);

  const markAllRead = useCallback(async () => {
    try {
      await persistAllNotificationsRead();
      dispatch(markAllNotificationsRead());
      return true;
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to mark notifications as read");
      return false;
    }
  }, [dispatch]);

  return {
    notifications: items as Notification[],
    unreadCount: items.filter(item => !item.isRead).length,
    loading, error,
    reload, markRead, markAllRead,
  };
}
