import { describe, expect, it } from "vitest";
import { readReadinessAttendance, PRESENT_STATES, readinessAttendancePatch } from "../app/pages/return-register/readinessAttendance";
const assignment = [{ meeting_id: "M-1", user_id: "U-1" }];
const row = { meeting_id: "M-1", participant_id: "U-1", check_in_time: "2026-11-24T10:00:00Z" };
const read = (rows: Array<typeof row & Record<string, unknown>>, scope = {}) => readReadinessAttendance("M-1", assignment, rows, scope);
describe("WS1 QR-03/PT-10 authoritative readiness readback", () => {
  it("does not treat Left, Excused, Recused or Not Joined as present merely because they once checked in", () => {
    for (const status of ["Left", "Excused", "Recused", "Not Joined"]) {
      const result = read([{ ...row, attendance_status: status }]);
      expect(result.values["U-1"]).toBe(status);
      expect(PRESENT_STATES.includes(result.values["U-1"])).toBe(false);
    }
  });
  it("uses explicit present and temporarily away status as the approved SQL contract", () => {
    for (const status of ["Present", "Temporarily Away"]) expect(read([{ ...row, attendance_status: status }]).values["U-1"]).toBe(status);
  });
  it("resolves legacy check-out before check-in and only falls back when explicit status is absent", () => {
    expect(read([{ ...row, check_out_time: "2026-11-24T10:30:00Z" }]).values["U-1"]).toBe("Left");
    expect(read([row]).values["U-1"]).toBe("Present");
  });
  it("rejects invalid explicit status instead of using a stale timestamp", () => {
    const result = read([{ ...row, attendance_status: "Unknown" }]);
    expect(result.values["U-1"]).toBe("Not Joined");
    expect(result.conflicts).toHaveLength(1);
  });
  it("never consumes another meeting or participant record", () => {
    expect(read([{ ...row, meeting_id: "M-2" }, { ...row, participant_id: "U-2" }]).values["U-1"]).toBe("Not Joined");
  });
  it("fails closed when attendance rows for one assigned member are duplicated", () => {
    const result = read([row, { ...row, attendance_status: "Left" }]);
    expect(result.values["U-1"]).toBe("Not Joined");
    expect(result.conflicts).toHaveLength(1);
  });
  it("does not carry legacy or closed-session attendance into a reopened session", () => {
    expect(read([row, { ...row, live_session_id: "S-1" }], { sessionId: "S-2", reopened: true }).values["U-1"]).toBe("Not Joined");
    expect(read([row, { ...row, live_session_id: "S-1" }], { reopened: true }).values["U-1"]).toBe("Not Joined");
  });
  it("uses only the exact current session and flags contradictory session aliases", () => {
    expect(read([row, { ...row, live_session_id: "S-2", attendance_status: "Present" }], { sessionId: "S-2", reopened: true }).values["U-1"]).toBe("Present");
    const result = read([{ ...row, live_session_id: "S-1", session_id: "S-2" }], { sessionId: "S-2" });
    expect(result.values["U-1"]).toBe("Not Joined");
    expect(result.conflicts).toHaveLength(1);
    expect(read([{ ...row, live_session_id: "S-1", session_id: "S-2" }, { ...row, live_session_id: "S-2" }], { sessionId: "S-2" }).values["U-1"]).toBe("Not Joined");
  });
  it("persists explicit nonpresent states without erasing historical check-in", () => {
    const patch = readinessAttendancePatch(row, "Recused", "later");
    expect(patch.attendance_status).toBe("Recused");
    expect(patch.check_in_time).toBe(row.check_in_time);
    expect(read([{ ...row, ...patch }]).values["U-1"]).toBe("Recused");
  });
  it("records a departure and a later check-in consistently", () => {
    const departure = readinessAttendancePatch(row, "Left", "departure");
    expect(departure.check_out_time).toBe("departure");
    const rejoin = readinessAttendancePatch(departure, "Present", "rejoin");
    expect(rejoin.check_in_time).toBe("rejoin");
    expect(rejoin.check_out_time).toBe("");
  });
});
