import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveCanonicalOnlineRoomEntry } from "../app/pages/meetings/onlineMeetingEntryState";
import { canonicalLiveControlStatus } from "../app/pages/meetings/regularMeetingSessionState";

describe("LM: audited recovery of an ended LiveKit meeting", () => {
  it("never lets Join bypass a genuinely ended meeting", () => {
    const ended = resolveCanonicalOnlineRoomEntry("Awaiting Minutes", [{ session_status: "ended" }]);
    expect(ended.canJoin).toBe(false);
    expect(ended.mayAttemptStart).toBe(false);
  });

  it("admits the recovered meeting only after SQL provides a new active session", () => {
    const recovered = resolveCanonicalOnlineRoomEntry("In Progress", [
      { session_status: "ended" }, { session_status: "active" },
    ]);
    expect(recovered).toMatchObject({ canJoin: true, reason: undefined });
    expect(canonicalLiveControlStatus("active", "In Progress")).toBe("in-progress");
  });

  it("still blocks cancelled and minutes-approved meetings, even with an active session", () => {
    for (const status of ["Cancelled", "Minutes Approved", "Completed"]) {
      expect(resolveCanonicalOnlineRoomEntry(status, [{ session_status: "active" }]).canJoin).toBe(false);
    }
  });

  it("does not accept two simultaneous active rooms", () => {
    expect(resolveCanonicalOnlineRoomEntry("In Progress", [
      { session_status: "active" }, { session_status: "paused" },
    ]).canJoin).toBe(false);
  });

  it("requires a server-authorized, audited recovery instead of resurrecting an ended session", () => {
    const sql = readFileSync("supabase/migrations/20261123230000_convay_audited_meeting_reopen.sql", "utf8");
    const client = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    expect(sql).toContain("convay_private.meeting_reopen_events");
    expect(sql).toContain("pg_catalog.current_setting('convay.authorized_meeting_reopen',true)");
    expect(sql).toContain("p.account_role='super_admin'");
    expect(sql).toContain("convay_private.has_permission('mtg_start')");
    expect(sql).toContain("v_total");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("previous_session.record_id");
    expect(sql).not.toMatch(/UPDATE public\.convay_entity_records[^;]*session_status[^;]*'active'/is);
    expect(client).toContain("item.session_status === \"active\" || item.session_status === \"paused\"");
    expect(client).toContain('convayAuth.reopenMeeting(meetingId, reason)');
  });
});
