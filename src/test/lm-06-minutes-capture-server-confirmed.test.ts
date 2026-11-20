import { describe, expect, it, vi } from "vitest";
import {
  commitVerifiedMinutesCapture, plannedMinutesStatus,
  type MinutesCaptureRequest,
} from "../app/pages/meetings/regularMeetingMinutesCaptureState";

const makeRequest = (partial: Partial<MinutesCaptureRequest> = {}): MinutesCaptureRequest => ({
  meetingId: "meeting-a", actorId: "actor-a",
  session: { id: "session-a", meeting_id: "meeting-a", session_status: "active", minutes_capture_status: "not_started" },
  action: "start", confirmedSavedMinutes: false, at: "2026-11-20T09:00:00.000Z",
  applyBatch: vi.fn(async () => 2),
  readSessions: vi.fn(async () =>
    [{ id: "session-a", meeting_id: "meeting-a", session_status: "active", minutes_capture_status: "active" }]),
  ...partial,
});
describe("LM-06 SQL-confirmed minutes-capture lifecycle", () => {
  it("starts only during an active meeting with a not-started capture", () => {
    expect(plannedMinutesStatus(makeRequest())).toBe("active");
  });
  it("refuses a duplicate start", () => {
    expect(() => plannedMinutesStatus(makeRequest({ session: { id: "session-a", meeting_id: "meeting-a", session_status: "active", minutes_capture_status: "active" } }))).toThrow(/only once/);
  });
  it("refuses a start for an ended session", () => {
    expect(() => plannedMinutesStatus(makeRequest({ session: { id: "session-a", meeting_id: "meeting-a", session_status: "ended", minutes_capture_status: "not_started" } }))).toThrow(/active meeting/);
  });
  it("rejects a wrong meeting ID before touching SQL", async () => {
    const write = vi.fn(async (_operations: unknown) => 2);
    await expect(commitVerifiedMinutesCapture(makeRequest({ meetingId: "meeting-b", applyBatch: write }))).rejects.toThrow(/valid meeting/);
    expect(write).not.toHaveBeenCalled();
  });
  it("requires an ended meeting and saved minutes before completion", () => {
    const active = makeRequest({ action: "complete" });
    expect(() => plannedMinutesStatus(active)).toThrow(/End the meeting/);
    const ended = { ...active.session, session_status: "ended" };
    expect(() => plannedMinutesStatus(makeRequest({ action: "complete", session: ended }))).toThrow(/Save the actual/);
    expect(plannedMinutesStatus(makeRequest({ action: "complete", session: ended, confirmedSavedMinutes: true }))).toBe("completed");
  });
  it("rejects invalid paused/ended capture statuses instead of persisting them", () => {
    for (const bad of ["paused", "ended"]) {
      expect(() => plannedMinutesStatus(makeRequest({ session: { id: "session-a", meeting_id: "meeting-a", session_status: "active", minutes_capture_status: bad } }))).toThrow();
    }
  });
  it("atomically writes state and stable audit record and confirms readback", async () => {
    const write = vi.fn(async (_operations: unknown) => 2);
    const request = makeRequest({ applyBatch: write });
    await expect(commitVerifiedMinutesCapture(request)).resolves.toBe("active");
    const operations = write.mock.calls[0][0] as unknown as Array<{ entity_key: string; record_id: string; payload: Record<string, unknown> }>;
    expect(operations).toHaveLength(2);
    expect(operations[0]).toMatchObject({ entity_key: "bms.liveSessions", record_id: "session-a", payload: { minutes_capture_status: "active" } });
    expect(operations[1]).toMatchObject({ entity_key: "bms.meetingInteractions", record_id: "MIN-CAP-session-a-start", payload: { meeting_id: "meeting-a", user_id: "actor-a" } });
  });
  it("refuses incomplete SQL ACK", async () => {
    await expect(commitVerifiedMinutesCapture(makeRequest({ applyBatch: vi.fn(async () => 1) }))).rejects.toThrow(/fully acknowledged/);
  });
  it("refuses missing or mismatched server readback", async () => {
    await expect(commitVerifiedMinutesCapture(makeRequest({ readSessions: vi.fn(async () => []) }))).rejects.toThrow(/verified/);
    await expect(commitVerifiedMinutesCapture(makeRequest({ readSessions: vi.fn(async () =>
      [{ id: "session-a", meeting_id: "meeting-b", session_status: "active", minutes_capture_status: "active" }] ) }))).rejects.toThrow(/verified/);
  });
  it("does not misreport a stale capture status after an ACK", async () => {
    await expect(commitVerifiedMinutesCapture(makeRequest({ readSessions: vi.fn(async () =>
      [{ id: "session-a", meeting_id: "meeting-a", session_status: "active", minutes_capture_status: "not_started" }] ) }))).rejects.toThrow(/verified/);
  });
  it("complete writes only the allowed completed state", async () => {
    const write = vi.fn(async (_operations: unknown) => 2);
    const request = makeRequest({
      action: "complete", confirmedSavedMinutes: true, applyBatch: write,
      session: { id: "session-a", meeting_id: "meeting-a", session_status: "ended", minutes_capture_status: "active" },
      readSessions: vi.fn(async () =>
        [{ id: "session-a", meeting_id: "meeting-a", session_status: "ended", minutes_capture_status: "completed" }]),
    });
    await expect(commitVerifiedMinutesCapture(request)).resolves.toBe("completed");
    const operations = write.mock.calls[0][0] as unknown as Array<{ entity_key: string; record_id: string; payload: Record<string, unknown> }>;
    expect(operations[0].payload.minutes_capture_status).toBe("completed");
    expect(operations[1].record_id).toBe("MIN-CAP-session-a-complete");
  });
});
