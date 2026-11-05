import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";
import { convayAuth } from "../app/services/supabase/convayAuth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function revisionContext(permissions: string[]): ActionContext {
  return {
    entity: "meeting",
    record: { id: "MTG-MT18-TEST", approval_status: "Pending Approval" },
    currentUser: { id: "mt18-approver", name: "Meeting Approver" },
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

describe("MT-18 request meeting revision", () => {
  it("exposes the revision action only to users with mtg_approve", () => {
    const action = resolveMeetingActions(revisionContext(["mtg_approve"]))
      .find(candidate => candidate.id === "request_revision");
    expect(action?.visible).toBe(true);
    expect(action?.enabled).toBe(true);
    expect(action?.requiresReason).toBe(true);
    expect(action?.reasonLabel).toBe("Revision instructions");

    const denied = resolveMeetingActions(revisionContext(["mtg_view"]))
      .find(candidate => candidate.id === "request_revision");
    expect(denied?.visible).toBe(false);
    expect(denied?.enabled).toBe(false);
  });

  it("persists the instructions through the authenticated, scoped SQL RPC", async () => {
    const userId = "c7ed67e3-0da1-4d13-a7a6-2812c76f1548";
    sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({
      accessToken: "unit-test-access-token",
      refreshToken: "unit-test-refresh-token",
      userId,
      expiresAt: Date.now() + 60 * 60 * 1000,
    }));
    const payload = {
      id: "MTG-MT18-TEST",
      approval_status: "Revision Requested",
      revision_instructions: "Please correct the submitted meeting agenda.",
    };
    const fetchMock = vi.fn(async () => json(payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convayAuth.requestMeetingRevision(
      " MTG-MT18-TEST ",
      " Please correct the submitted meeting agenda. ",
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cnrueblhgvdonplirlhv.supabase.co/rest/v1/rpc/convay_request_meeting_revision",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer unit-test-access-token" }),
        body: JSON.stringify({
          p_record_id: "MTG-MT18-TEST",
          p_revision_instructions: "Please correct the submitted meeting agenda.",
        }),
      }),
    );
  });

  it("rejects short instructions before making a SQL request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(convayAuth.requestMeetingRevision("MTG-MT18-TEST", "Too short"))
      .rejects.toThrow("Please provide revision instructions (at least 10 characters)");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not report success when SQL returns a different status or instruction", async () => {
    sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({
      accessToken: "unit-test-access-token",
      refreshToken: "unit-test-refresh-token",
      userId: "c7ed67e3-0da1-4d13-a7a6-2812c76f1548",
      expiresAt: Date.now() + 60 * 60 * 1000,
    }));
    vi.stubGlobal("fetch", vi.fn(async () => json({
      id: "MTG-MT18-TEST",
      approval_status: "Pending Approval",
      revision_instructions: "Please correct the submitted meeting agenda.",
    })));

    await expect(convayAuth.requestMeetingRevision(
      "MTG-MT18-TEST",
      "Please correct the submitted meeting agenda.",
    )).rejects.toThrow("Supabase did not confirm the meeting revision request.");
  });
});
