import { describe, expect, it } from "vitest";
import { buildMeetingStartBatch } from "../app/utils/meetingStartCommand";

const input = {
  meetingRecordId: "uuid-for-meeting",
  meetingId: "MTG-2026-0001",
  actorId: "signed-in-actor",
  startedAt: "2026-11-04T10:00:00Z",
};

describe("Atomic SQL meeting-start command", () => {
  it("updates the meeting and creates exactly one canonical live session", () => {
    const ops = buildMeetingStartBatch(input);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toEqual({
      entity_key: "bms.meetings", action: "update", record_id: input.meetingRecordId,
      payload: { approval_status: "In Progress" },
    });
    expect(ops[1].entity_key).toBe("bms.liveSessions");
    expect(ops[1].action).toBe("create");
    expect(ops[1].record_id).toBe("SES-MTG-2026-0001");
    expect(ops[1].payload.session_status).toBe("active");
    expect(ops[1].payload.started_by).toBe(input.actorId);
  });

  it("resumes an existing session without making a duplicate", () => {
    const ops = buildMeetingStartBatch({
      ...input,
      existingSession: { id: "session-1", session_status: "paused", started_at: "2026-11-03T15:00:00Z", started_by: "host-1" },
    });
    expect(ops[1]).toEqual({
      entity_key: "bms.liveSessions", action: "update", record_id: "session-1",
      payload: { session_status: "active", started_at: "2026-11-03T15:00:00Z", started_by: "host-1" },
    });
  });

  it("rejects a closed session rather than silently restarting it", () => {
    expect(() => buildMeetingStartBatch({ ...input, existingSession: { id: "closed", session_status: "ended" } }))
      .toThrow(/closed meeting cannot be restarted/);
  });

  it("requires a real meeting and authenticated actor", () => {
    expect(() => buildMeetingStartBatch({ ...input, actorId: "" })).toThrow(/Missing meeting/);
    expect(() => buildMeetingStartBatch({ ...input, meetingRecordId: "" })).toThrow(/Missing meeting/);
  });
});
