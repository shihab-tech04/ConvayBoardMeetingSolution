import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => vi.fn());
vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: request },
}));

import {
  listPersonalNotifications, persistNotificationRead,
  persistAllNotificationsRead, notificationDestinationPath,
} from "../app/services/supabase/convayNotifications";

const notification = (id: string) => ({
  id, recipient_user_id: "test-user", type: "approval", priority: "high",
  title: "Agenda approval needed", message: "Review before the meeting",
  module: "Agenda", destination: { main: "meetings", sub: "all-meetings" },
  is_read: false, created_at: "2026-11-05T01:00:00Z",
});

beforeEach(() => request.mockReset());

describe("HM-07 Supabase-backed notification inbox", () => {
  it("reads server-owned notifications using the authenticated transport", async () => {
    request.mockResolvedValue({ json: async () => [notification("n1")] });
    const result = await listPersonalNotifications("test-user");
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toContain("/rest/v1/convay_user_notifications?");
    expect(request.mock.calls[0][0]).toContain("recipient_user_id=eq.test-user");
    expect(result[0]).toMatchObject({
      id: "n1", title: "Agenda approval needed",
      isRead: false, destination: { main: "meetings", sub: "all-meetings" },
    });
  });

  it("pages beyond the PostgREST row limit rather than silently truncating the inbox", async () => {
    const first = Array.from({ length: 200 }, (_, i) => notification("n" + i));
    request.mockResolvedValueOnce({ json: async () => first });
    request.mockResolvedValueOnce({ json: async () => [notification("n200")] });
    const result = await listPersonalNotifications("test-user");
    expect(result).toHaveLength(201);
    expect(request.mock.calls[1][0]).toContain("offset=200");
  });

  it("rejects a mismatched row even if a switched session returns another user's data", async () => {
    request.mockResolvedValue({ json: async () => [{ ...notification("foreign"), recipient_user_id: "other-user" }] });
    await expect(listPersonalNotifications("test-user")).rejects.toThrow("ownership changed");
  });

  it("persists one read acknowledgement and verifies the exact affected row", async () => {
    request.mockResolvedValue({ json: async () => [{ id: "n1" }] });
    await persistNotificationRead("n1", "test-user");
    const [path, config] = request.mock.calls[0];
    expect(path).toContain("id=eq.n1");
    expect(path).toContain("recipient_user_id=eq.test-user");
    expect(config.method).toBe("PATCH");
    expect(JSON.parse(config.body)).toEqual({ is_read: true });
  });

  it("rejects access-denied or missing notification updates rather than showing false success", async () => {
    request.mockResolvedValue({ json: async () => [] });
    await expect(persistNotificationRead("different-user-notification", "test-user"))
      .rejects.toThrow("no longer accessible");
  });

  it("persists mark-all-read within the authenticated and RLS-scoped inbox", async () => {
    request.mockResolvedValue({ status: 204 });
    await persistAllNotificationsRead("test-user");
    const [path, config] = request.mock.calls[0];
    expect(path).toContain("is_read=eq.false");
    expect(path).toContain("recipient_user_id=eq.test-user");
    expect(config.method).toBe("PATCH");
    expect(JSON.parse(config.body)).toEqual({ is_read: true });
  });

  it("does not navigate to external addresses or unsafe route segments", () => {
    expect(notificationDestinationPath({ main: "meetings", sub: "all-meetings" }))
      .toBe("/meetings/all-meetings");
    expect(notificationDestinationPath({ main: "https://example.com" }))
      .toBe("/home/notifications");
    expect(notificationDestinationPath({ main: "home", sub: "../admin" }))
      .toBe("/home/notifications");
    expect(notificationDestinationPath({ main: "javascript:alert(1)" }))
      .toBe("/home/notifications");
  });
});
