import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";
import { convayAuth } from "../app/services/supabase/convayAuth";
import { actionGranted, filterActionsByAccess } from "../app/services/supabase/actionPermissions";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function meetingContext(approvalStatus: string, permissions = ["mtg_update"]): ActionContext {
  return {
    entity: "meeting",
    record: {
      id: "MTG-MT20-TEST",
      meeting_id: "MTG-MT20-TEST",
      approval_status: approvalStatus,
      organizer_user_id: "mt20-organizer",
      meeting_date: "2026-12-10",
      start_time: "10:00",
    },
    currentUser: { id: "mt20-organizer", name: "Meeting Organizer" },
    userRole: "Meeting Organizer",
    permissions,
    now: new Date("2026-12-01T12:00:00.000Z"),
  };
}

function setupSession() {
  sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({
    accessToken: "unit-test-access-token",
    refreshToken: "unit-test-refresh-token",
    userId: "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235",
    expiresAt: Date.now() + 60 * 60 * 1000,
  }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MT-20 schedule and publish", () => {
  it("offers scheduling only after approval and publishing only after scheduling", () => {
    const approved = resolveMeetingActions(meetingContext("Approved"));
    expect(approved.map(action => action.id)).toContain("schedule_meeting");
    expect(approved.map(action => action.id)).not.toContain("publish_meeting");
    expect(approved.map(action => action.id)).not.toContain("start");
    expect(approved.map(action => action.id)).not.toContain("join");

    const scheduled = resolveMeetingActions(meetingContext("Scheduled"));
    expect(scheduled.map(action => action.id)).toContain("publish_meeting");
    expect(scheduled.map(action => action.id)).not.toContain("start");
    expect(scheduled.map(action => action.id)).not.toContain("join");

    const published = resolveMeetingActions(meetingContext("Published"));
    expect(published.map(action => action.id)).toContain("start");
    expect(published.map(action => action.id)).toContain("join");
  });

  it("requires the existing mtg_update permission for both lifecycle actions", () => {
    expect(actionGranted("meeting", "schedule_meeting", ["mtg_view"], false)).toBe(false);
    expect(actionGranted("meeting", "publish_meeting", ["mtg_view"], false)).toBe(false);
    expect(actionGranted("meeting", "schedule_meeting", ["mtg_update"], false)).toBe(true);
    expect(actionGranted("meeting", "publish_meeting", ["mtg_update"], false)).toBe(true);
    const schedule = resolveMeetingActions(meetingContext("Approved"));
    expect(filterActionsByAccess("meeting", schedule, ["mtg_view"], false)).toEqual([]);
  });

  it.each([
    ["scheduleMeeting", "convay_schedule_meeting", "Scheduled", "scheduled_by", "scheduled_at"],
    ["publishMeeting", "convay_publish_meeting", "Published", "published_by", "published_at"],
  ] as const)("confirms %s from the authenticated SQL RPC response", async (method, rpc, status, actorField, timeField) => {
    setupSession();
    const userId = "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235";
    const payload = {
      id: "MTG-MT20-TEST",
      approval_status: status,
      [actorField]: userId,
      [timeField]: "2026-11-05T16:00:00.000Z",
    };
    const fetchMock = vi.fn(async () => json(payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convayAuth[method](" MTG-MT20-TEST ");

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      `https://cnrueblhgvdonplirlhv.supabase.co/rest/v1/rpc/${rpc}`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer unit-test-access-token" }),
        body: JSON.stringify({ p_record_id: "MTG-MT20-TEST" }),
      }),
    );
  });

  it.each(["scheduleMeeting", "publishMeeting"] as const)("rejects an empty ID for %s before making a request", async method => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(convayAuth[method]("  ")).rejects.toThrow("A meeting ID is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not report persistence when the database returns the wrong lifecycle status", async () => {
    setupSession();
    vi.stubGlobal("fetch", vi.fn(async () => json({
      id: "MTG-MT20-TEST",
      approval_status: "Approved",
      scheduled_by: "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235",
      scheduled_at: "2026-11-05T16:00:00.000Z",
    })));
    await expect(convayAuth.scheduleMeeting("MTG-MT20-TEST")).rejects.toThrow(
      "Supabase did not confirm the meeting schedule.",
    );
  });

  it("surfaces a rejected SQL write instead of treating its error body as a result", async () => {
    setupSession();
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Meeting update permission required" }, 403)));
    await expect(convayAuth.publishMeeting("MTG-MT20-TEST")).rejects.toThrow(
      "Meeting update permission required",
    );
  });
});
