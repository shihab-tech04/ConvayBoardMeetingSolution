import { useState, startTransition } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { useNotificationsState } from "../../hooks/useNotificationsState";
import { notificationDestinationPath } from "../../services/supabase/convayNotifications";
import type { Notification } from "../../store/notificationsSlice";

type Filter = "all" | "unread" | "approval" | "assignment" | "security";

export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, loading, error, reload } = useNotificationsState();
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = notifications.filter(n =>
    filter === "all" || (filter === "unread" ? !n.isRead : n.type === filter)
  );

  const openNotification = (n: Notification) => {
    void markRead(n.id);
    startTransition(() => navigate(notificationDestinationPath(n.destination)));
  };

  const filters: Array<{ value: Filter; label: string }> = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "approval", label: "Approvals" },
    { value: "assignment", label: "Assigned" },
    { value: "security", label: "Security" },
  ];

  return (
    <main className="table-page" style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ color: "var(--color-text-primary)", fontSize: 24, fontWeight: 600 }}>Notifications</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 4 }}>
            {unreadCount > 0 ? unreadCount + " unread notifications" : "Your notification inbox"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="notification-dropdown__mark-read"
            onClick={() => void reload()} disabled={loading} aria-label="Refresh notifications">
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </button>
          {unreadCount > 0 && (
            <button type="button" className="notification-dropdown__mark-read"
              onClick={() => void markAllRead()}>
              <CheckCheck size={16} aria-hidden="true" /> Mark all as read
            </button>
          )}
        </div>
      </div>
      <nav aria-label="Notification filters" className="notification-dropdown__filters" style={{ marginBottom: 16 }}>
        {filters.map(f => (
          <button key={f.value} type="button"
            aria-pressed={filter === f.value}
            className={`notification-dropdown__filter-chip${filter === f.value ? " notification-dropdown__filter-chip--active" : ""}`}
            onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </nav>
      {loading ? (
        <div className="dash-compact-card" role="status" style={{ padding: 24 }}>
          Loading notifications...
        </div>
      ) : error ? (
        <div className="dash-compact-card" role="alert" style={{ padding: 24 }}>
          <p>Notifications could not be loaded. {error}</p>
          <button type="button" className="notification-dropdown__mark-read" onClick={() => void reload()}>
            Retry loading
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dash-compact-card" style={{ textAlign: "center", padding: 36 }}>
          <Bell size={28} aria-hidden="true" style={{ margin: "0 auto 10px", color: "var(--color-text-secondary)" }} />
          <h2 style={{ fontSize: 16, color: "var(--color-text-primary)" }}>No notifications</h2>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {filter === "all" ? "You are all caught up." : "No notifications match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="dash-compact-card" aria-label="Your notifications" style={{ overflow: "hidden" }}>
          {filtered.map(n => (
            <button key={n.id} type="button" className={`notification-dropdown__item${n.isRead ? "" : " notification-dropdown__item--unread"}`}
              style={{ width: "100%", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}
              onClick={() => openNotification(n)}
              aria-label={`${n.isRead ? "Read" : "Unread"}: ${n.title}. ${n.message}`}>
              <div className="notification-dropdown__item-content">
                <div className="notification-dropdown__item-header">
                  <h2 className="notification-dropdown__item-title" style={{ fontSize: 15 }}>{n.title}</h2>
                  {!n.isRead && <span aria-hidden="true" className="notification-dropdown__item-unread-dot" />}
                </div>
                <p className="notification-dropdown__item-message">{n.message}</p>
                <div className="notification-dropdown__item-meta">
                  <span>{n.module}</span><span aria-hidden="true">·</span><span>{n.time}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
