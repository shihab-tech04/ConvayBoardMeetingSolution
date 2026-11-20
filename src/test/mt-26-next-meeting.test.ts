import { beforeEach, describe, expect, it, vi } from "vitest";
import { convayAuth } from "../app/services/supabase/convayAuth";
import { createNextMeeting, nextMeetingDefaults } from "../app/pages/return-register/meetingNextCreation";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));
const send = vi.mocked(convayAuth.authenticatedRequest);
beforeEach(() => send.mockReset());

const next = {
  meeting_title: "Next Meeting", committee: "Board", meeting_type: "Regular",
  meeting_date: "2026-12-18", start_time: "10:00", end_time: "12:00",
  time_zone: "Asia/Dhaka", mode: "Physical",
};
const command = {
  sourceMeetingId: "MTG-2026-001", sourceRevision: 3, requestId: "intent-1", next,
};
const newId = "MTG-2026-002";
const successAck = {
  source_meeting_id: command.sourceMeetingId,
  new_meeting_id: newId,
  request_id: command.requestId,
  outcome: "created",
};
const validRow = {
  record_id: newId, revision: 1,
  payload: {
    id: newId,
    meeting_id: newId,
    source_meeting_id: command.sourceMeetingId,
    approval_status: "Draft",
  },
};
function mockJson(value: unknown): Response {
  return { json: async () => value } as Response;
}

describe("MT-26 Create Next Meeting fail-closed source contract", () => {
  it("offers allowed context only from Completed, without carrying old sensitive fields", () => {
    expect(nextMeetingDefaults({
      id: command.sourceMeetingId, approval_status: "Completed",
      meeting_title: "Board Meeting", committee: "Board", meeting_type: "Regular",
      language: "English", meeting_date: "2024-01-01",
      activity_history: ["private"], approval_remark: "private", tenant_id: "forged",
    })).toEqual({
      meeting_title: "Board Meeting", committee: "Board",
      meeting_type: "Regular", language: "English",
    });
  });

  it("denies other statuses and missing source ID before any network call", () => {
    expect(() => nextMeetingDefaults({ id: "1", status: "Cancelled" })).toThrow();
    expect(() => nextMeetingDefaults({ id: "1", status: "Draft" })).toThrow();
    expect(() => nextMeetingDefaults({ status: "Completed" })).toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it("uses a stable request key, exact revision, then independently verifies saved Draft", async () => {
    send.mockResolvedValueOnce(mockJson(successAck)).mockResolvedValueOnce(mockJson([validRow]));
    await expect(createNextMeeting(command)).resolves.toMatchObject({
      new_meeting_id: newId, outcome: "created",
    });
    expect(send).toHaveBeenCalledTimes(2);
    const [path, options] = send.mock.calls[0];
    expect(path).toBe("/rest/v1/rpc/convay_create_next_meeting");
    const payload = JSON.parse(String(options?.body));
    expect(payload).toEqual({
      p_source_meeting_id: command.sourceMeetingId,
      p_expected_source_revision: 3,
      p_request_id: "intent-1",
      p_next_values: next,
    });
    expect(send.mock.calls[1][0]).toContain("record_id=eq." + newId);
    expect(send.mock.calls[1][1]).toMatchObject({ method: "GET" });
  });

  it("accepts explicit idempotent retry only if record is independently persisted", async () => {
    send.mockResolvedValueOnce(mockJson({
      ...successAck, outcome: "already_created",
    })).mockResolvedValueOnce(mockJson([validRow]));
    await expect(createNextMeeting(command)).resolves.toMatchObject({
      new_meeting_id: newId, outcome: "already_created",
    });
  });

  it("rejects malformed review, missing revision or extra forged field without network", async () => {
    await expect(createNextMeeting({ ...command, sourceRevision: 0 })).rejects.toThrow("revision");
    await expect(createNextMeeting({
      ...command, next: { ...next, approval_status: "Approved" } as never,
    })).rejects.toThrow("Unapproved");
    await expect(createNextMeeting({
      ...command, next: { ...next, meeting_date: "" },
    })).rejects.toThrow("Missing meeting_date");
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses wrong-source, source-ID reuse and missing ACK without readback", async () => {
    send.mockResolvedValueOnce(mockJson({
      ...successAck, source_meeting_id: "wrong",
    }));
    await expect(createNextMeeting(command)).rejects.toThrow("did not confirm");
    send.mockResolvedValueOnce(mockJson({
      ...successAck, new_meeting_id: command.sourceMeetingId,
    }));
    await expect(createNextMeeting(command)).rejects.toThrow("did not confirm");
    send.mockResolvedValueOnce(mockJson(null));
    await expect(createNextMeeting(command)).rejects.toThrow("did not confirm");
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("rejects absent, duplicated, malformed or unreadable persisted records", async () => {
    for (const badRows of [[], [validRow, validRow], null, [{}], [{ record_id: newId }]]) {
      send.mockResolvedValueOnce(mockJson(successAck)).mockResolvedValueOnce(mockJson(badRows));
      await expect(createNextMeeting(command)).rejects.toThrow("could not be verified");
    }
  });

  it("rejects altered source provenance, state, identity or nonpositive revision", async () => {
    const badRows = [
      { ...validRow, payload: { ...validRow.payload, source_meeting_id: "OTHER" } },
      { ...validRow, payload: { ...validRow.payload, approval_status: "Completed" } },
      { ...validRow, payload: { ...validRow.payload, id: "wrong" } },
      { ...validRow, revision: 0 },
      { ...validRow, record_id: "other" },
    ];
    for (const row of badRows) {
      send.mockResolvedValueOnce(mockJson(successAck)).mockResolvedValueOnce(mockJson([row]));
      await expect(createNextMeeting(command)).rejects.toThrow("did not persist");
    }
  });

  it("propagates readback failures and keeps retry ID unchanged", async () => {
    send.mockResolvedValueOnce(mockJson(successAck))
      .mockRejectedValueOnce(new Error("Record read denied"))
      .mockResolvedValueOnce(mockJson({ ...successAck, outcome: "already_created" }))
      .mockResolvedValueOnce(mockJson([validRow]));
    await expect(createNextMeeting(command)).rejects.toThrow("Record read denied");
    await expect(createNextMeeting(command)).resolves.toMatchObject({
      outcome: "already_created",
    });
    const initial = JSON.parse(String(send.mock.calls[0][1]?.body));
    const retried = JSON.parse(String(send.mock.calls[2][1]?.body));
    expect(initial.p_request_id).toBe(retried.p_request_id);
  });
});
