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

describe("MT-26 Create Next Meeting fail-closed source contract", () => {
  it("only offers allowed context from a Completed meeting", () => {
    expect(nextMeetingDefaults({
      id: command.sourceMeetingId, approval_status: "Completed",
      meeting_title: "Board Meeting", committee: "Board", meeting_type: "Regular",
      language: "English", meeting_date: "2024-01-01",
      activity_history: ["secret"], approval_remark: "private", tenant_id: "forged",
    })).toEqual({
      meeting_title: "Board Meeting", committee: "Board",
      meeting_type: "Regular", language: "English",
    });
  });
  it("denies other statuses and missing source ID before server calls", () => {
    expect(() => nextMeetingDefaults({ id: "1", status: "Cancelled" })).toThrow();
    expect(() => nextMeetingDefaults({ id: "1", status: "Draft" })).toThrow();
    expect(() => nextMeetingDefaults({ status: "Completed" })).toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it("passes exact source revision, reviewed inputs and stable request ID", async () => {
    send.mockResolvedValue({ json: async () => ({
      source_meeting_id: command.sourceMeetingId, new_meeting_id: "MTG-2026-002",
      request_id: command.requestId, outcome: "created",
    }) } as Response);
    await expect(createNextMeeting(command)).resolves.toMatchObject({
      new_meeting_id: "MTG-2026-002", outcome: "created",
    });
    const [path, options] = send.mock.calls[0];
    expect(path).toBe("/rest/v1/rpc/convay_create_next_meeting");
    const payload = JSON.parse(String(options?.body));
    expect(payload).toEqual({
      p_source_meeting_id: command.sourceMeetingId,
      p_expected_source_revision: 3,
      p_request_id: "intent-1",
      p_next_values: next,
    });
  });
  it("accepts an explicit idempotent retry acknowledgement", async () => {
    send.mockResolvedValue({ json: async () => ({
      source_meeting_id: command.sourceMeetingId, new_meeting_id: "MTG-2026-002",
      request_id: command.requestId, outcome: "already_created",
    }) } as Response);
    await expect(createNextMeeting(command)).resolves.toMatchObject({
      outcome: "already_created",
    });
  });
  it("rejects malformed review, missing revision or extra forged input before network", async () => {
    await expect(createNextMeeting({ ...command, sourceRevision: 0 })).rejects.toThrow("revision");
    await expect(createNextMeeting({
      ...command, next: { ...next, approval_status: "Approved" } as never,
    })).rejects.toThrow("Unapproved");
    await expect(createNextMeeting({
      ...command, next: { ...next, meeting_date: "" },
    })).rejects.toThrow("Missing meeting_date");
    expect(send).not.toHaveBeenCalled();
  });
  it("refuses mismatched server ACK, reused source ID and null ACK", async () => {
    send.mockResolvedValueOnce({ json: async () => ({
      source_meeting_id: "wrong", new_meeting_id: "MTG-2026-002",
      request_id: command.requestId, outcome: "created",
    }) } as Response);
    await expect(createNextMeeting(command)).rejects.toThrow("did not confirm");
    send.mockResolvedValueOnce({ json: async () => ({
      source_meeting_id: command.sourceMeetingId,
      new_meeting_id: command.sourceMeetingId,
      request_id: command.requestId, outcome: "created",
    }) } as Response);
    await expect(createNextMeeting(command)).rejects.toThrow("did not confirm");
    send.mockResolvedValueOnce({ json: async () => null } as Response);
    await expect(createNextMeeting(command)).rejects.toThrow("did not confirm");
  });
});
