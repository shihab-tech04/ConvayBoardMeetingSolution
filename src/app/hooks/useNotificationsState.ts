import { useCallback, useEffect, useRef, useState } from "react";
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

// A read receipt invalidates outstanding inbox hydrations. Otherwise an older
// server response can put unread items back into Redux after a successful write.
let notificationMutationVersion = 0;

/** The topbar, mobile topbar and inbox share the authoritative server-backed store. */
export function useNotificationsState() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.notifications.items);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userId = useSelector((state: RootState) => state.currentUser.id);
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(
    () => Boolean(isAuthenticated && userId && import.meta.env.MODE !== "test"),
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const request = ++requestVersion.current;
    if (!isAuthenticated || !userId) {
      dispatch(setNotifications([]));
      setError(null);
      setLoading(false);
      return;
    }
    // Test-mode fixtures are never imported into the production database.
    if (import.meta.env.MODE === "test") return;
    const mutationAtRequest = notificationMutationVersion;
    setLoading(true);
    setError(null);
    try {
      const records = await listPersonalNotifications();
      if (request !== requestVersion.current || mutationAtRequest !== notificationMutationVersion) return;
      dispatch(setNotifications(records));
    } catch (reason) {
      if (request !== requestVersion.current || mutationAtRequest !== notificationMutationVersion) return;
      const message = reason instanceof Error ? reason.message : "Notifications could not be loaded";
      setError(message);
      dispatch(setNotifications([]));
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [dispatch, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      requestVersion.current++;
      dispatch(setNotifications([]));
      setError(null);
      setLoading(false);
      return;
    }
    void reload();
    // Cancels pending server reads when the authenticated owner changes or unmounts.
    return () => { requestVersion.current++; };
  }, [dispatch, isAuthenticated, userId, reload]);

  const markRead = useCallback(async (id: string) => {
    ++notificationMutationVersion;
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
    ++notificationMutationVersion;
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
