import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";
import { convayAuth } from "../app/services/supabase/convayAuth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function rejectionContext(permissions: string[]): ActionContext {
  return {
    entity: "meeting",
    record: { id: "MTG-MT19-TEST", approval_status: "Pending Approval" },
    currentUser: { id: "mt19-approver", name: "Meeting Approver" },
    userRole: "User",
    permissions,
    now: new Date("2026-11-05T12:00:00.000Z"),
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MT-19 reject meeting", () => {
  it("exposes rejection with a reason only to users with mtg_approve", () => {
    const action = resolveMeetingActions(rejectionContext(["mtg_approve"]))
      .find(candidate => candidate.id === "reject");
    expect(action?.visible).toBe(true);
    expect(action?.enabled).toBe(true);
    expect(action?.requiresReason).toBe(true);
    expect(action?.reasonLabel).toBe("Reason for rejection");

    const denied = resolveMeetingActions(rejectionContext(["mtg_view"]))
      .find(candidate => candidate.id === "reject");
    expect(denied?.visible).toBe(false);
    expect(denied?.enabled).toBe(false);
  });

  it("submits a trimmed reason through the authenticated, scoped SQL RPC", async () => {
    const userId = "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235";
    sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({
      accessToken: "unit-test-access-token",
      refreshToken: "unit-test-refresh-token",
      userId,
      expiresAt: Date.now() + 60 * 60 * 1000,
    }));
    const payload = {
      id: "MTG-MT19-TEST",
      approval_status: "Rejected",
      rejection_reason: "The request is missing the agenda documents.",
      rejected_by: userId,
      rejected_at: "2026-11-05T16:00:00.000Z",
    };
    const fetchMock = vi.fn(async () => json(payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convayAuth.rejectMeeting(
      " MTG-MT19-TEST ",
      " The request is missing the agenda documents. ",
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cnrueblhgvdonplirlhv.supabase.co/rest/v1/rpc/convay_reject_meeting",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer unit-test-access-token" }),
        body: JSON.stringify({
          p_record_id: "MTG-MT19-TEST",
          p_rejection_reason: "The request is missing the agenda documents.",
        }),
      }),
    );
  });

  it("rejects a short reason without making a SQL request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(convayAuth.rejectMeeting("MTG-MT19-TEST", "No")).rejects.toThrow(
      "Please provide a reason (at least 5 characters)",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not report success when SQL returns a different state or reason", async () => {
    sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({
      accessToken: "unit-test-access-token",
      refreshToken: "unit-test-refresh-token",
      userId: "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235",
      expiresAt: Date.now() + 60 * 60 * 1000,
    }));
    vi.stubGlobal("fetch", vi.fn(async () => json({
      id: "MTG-MT19-TEST",
      approval_status: "Pending Approval",
      rejection_reason: "The request is missing the agenda documents.",
    })));

    await expect(convayAuth.rejectMeeting(
      "MTG-MT19-TEST",
      "The request is missing the agenda documents.",
    )).rejects.toThrow("Supabase did not confirm the meeting rejection.");
  });
});
