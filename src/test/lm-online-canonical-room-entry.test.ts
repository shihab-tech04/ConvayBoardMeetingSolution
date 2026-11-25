import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveCanonicalOnlineRoomEntry as resolve } from "../app/pages/meetings/onlineMeetingEntryState";

describe("LM canonical LiveKit room admission and start gating", () => {
  it("allows an authorized host to ATTEMPT starting a SQL Scheduled meeting without active sessions", () => {
    expect(resolve("Scheduled", [])).toMatchObject({ mayAttemptStart: true, canJoin: false });
    expect(resolve("Published", [])).toMatchObject({ mayAttemptStart: true, canJoin: false });
    expect(resolve("Draft", [])).toMatchObject({ mayAttemptStart: true, canJoin: false });
    // Actor/start-window rights are independently validated by the start command in SQL.
  });
  it("admits only one active room and a corresponding active meeting", () => {
    expect(resolve("In Progress", [{ session_status: "active" }]))
      .toMatchObject({ canJoin: true, mayAttemptStart: false, reason: undefined });
    expect(resolve("Paused", [{ session_status: "paused" }])).toMatchObject({ canJoin: true });
    expect(resolve("On Break", [{ session_status: "paused" }])).toMatchObject({ canJoin: true });
  });
  it("fails closed for browser-stale in-progress control with no SQL session", () => {
    const state = resolve("Scheduled", []);
    expect(state.mayAttemptStart).toBe(true);
    expect(state.canJoin).toBe(false);
    // No browser-local status input: an old 'in-progress' snapshot cannot hide
    // the SQL-eligible admin start or cause admission.
    expect(Object.keys(state).sort()).toEqual(["canJoin", "mayAttemptStart", "reason"]);
  });
  it("rejects inconsistent meeting/session records rather than creating a duplicate", () => {
    expect(resolve("In Progress", [])).toMatchObject({ canJoin: false, mayAttemptStart: false });
    expect(resolve("Scheduled", [{ session_status: "active" }]))
      .toMatchObject({ canJoin: false, mayAttemptStart: false });
    expect(resolve("In Progress", [{ session_status: "active" }, { session_status: "active" }]))
      .toMatchObject({ canJoin: false, mayAttemptStart: false });
    expect(resolve("Scheduled", [{ session_status: "ended" }]))
      .toMatchObject({ canJoin: false, mayAttemptStart: false });
    expect(resolve("", [])).toMatchObject({ canJoin: false, mayAttemptStart: false });
  });
  it("never restarts terminal records", () => {
    for (const status of ["Cancelled", "Rejected", "Completed", "Awaiting Minutes", "Archived", "Ended"]) {
      expect(resolve(status, [])).toMatchObject({ canJoin: false, mayAttemptStart: false });
      expect(resolve(status, [{ session_status: "active" }]))
        .toMatchObject({ canJoin: false, mayAttemptStart: false });
    }
  });
  it("refreshes BOTH SQL meeting and session while waiting, never mints a room from local cache", () => {
    const code = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    expect(code).toContain("resolveCanonicalOnlineRoomEntry(");
    expect(code).toContain("Promise.all([refreshMeetings?.(), refreshLiveSessions?.()])");
    expect(code).toContain("onForceStart={access.loaded && canControlMeeting && canonicalRoomEntry.mayAttemptStart");
    expect(code).toContain('meetingStartWindowState(meeting as unknown as Record<string, unknown>, new Date()) === "available"');
    expect(code).toContain('if (isOnlineMeeting) return "prejoin"');
    expect(code).toContain('isOnlineMeeting && canonicalRoomEntry.canJoin && (');
    expect(code).toContain('if (isOnlineMeeting && phase === "meeting" && !canonicalRoomEntry.canJoin)');
  });
});
