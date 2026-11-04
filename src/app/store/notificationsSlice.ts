import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { MOCK_NOTIFICATIONS } from "../data/mockData";
import type { Notification, NotificationType, NotificationPriority } from "../data/mockData";

// Re-export notification types for convenience
export type { Notification, NotificationType, NotificationPriority };

// ── State ─────────────────────────────────────────────────────────────────────
interface NotificationsState {
  items: Notification[];
  /** Account that owns the hydrated SQL records; never show one account's inbox to another. */
  ownerId: string | null;
}

const initialState: NotificationsState = {
  // Historical placeholder notifications exist only in deterministic tests.
  items: import.meta.env.MODE === "test" ? (MOCK_NOTIFICATIONS as Notification[]) : [],
  ownerId: null,
};

// ── Slice ─────────────────────────────────────────────────────────────────────
const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    markNotificationRead(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item) item.isRead = true;
    },
    markAllNotificationsRead(state) {
      state.items.forEach((n) => { n.isRead = true; });
    },
    setNotifications(state, action: PayloadAction<{ ownerId: string | null; items: Notification[] }>) {
      state.ownerId = action.payload.ownerId;
      state.items = action.payload.items;
    },
  },
});

export const {
  markNotificationRead,
  markAllNotificationsRead,
  setNotifications,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
