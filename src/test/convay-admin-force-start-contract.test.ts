import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { ResolvedAction } from "../app/actions/types";
import { resolveMeetingStartCardState } from "../app/pages/dashboard/liveMeetingCardActions";

const sql = readFileSync("supabase/migrations/20261123171000_convay_superadmin_atomic_force_start.sql", "utf8");
const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const lobby = readFileSync("src/app/components/meetings/MeetingPreJoinPanel.tsx", "utf8");
const transport = readFileSync("src/app/services/supabase/convayAuth.ts", "utf8");
const dashboard = readFileSync("src/app/pages/dashboard/DashboardPage.tsx", "utf8");
const action = (id: string, enabled: boolean): ResolvedAction =>
  ({ id, enabled, visible: true, placement: "direct", priority: 1, label: id } as ResolvedAction);

describe("LM-ADMIN: real Super Admin Force Start contract", () => {
  it("makes Force Start accessible to the verified admin on every eligible meeting card", () => {
    const meeting = { approval_status: "Scheduled", meeting_date: "2026-11-23", start_time: "10:00" };
    const now = new Date("2026-11-23T13:00:00Z");
    expect(resolveMeetingStartCardState(meeting, [], now, true))
      .toMatchObject({ enabled: true, label: "Force Start Now", entryAction: "start_meeting" });
    expect(resolveMeetingStartCardState(meeting, [], now, false).enabled).toBe(false);
    expect(resolveMeetingStartCardState({ ...meeting, approval_status: "Cancelled" }, [], now, true).enabled).toBe(false);
    expect(resolveMeetingStartCardState({ ...meeting, approval_status: "Completed" }, [], now, true).enabled).toBe(false);
    expect(resolveMeetingStartCardState({ ...meeting, approval_status: "In Progress" }, [action("continue_meeting", true)], now, true))
      .toMatchObject({ enabled: true, label: "Continue Live Meeting" });
    expect(dashboard).toContain("startAccess.loaded && startAccess.is_super_admin");
  });
  it("uses authenticated RPC and SQL readback, never client-supplied admin grants", () => {
    expect(transport).toContain("/rest/v1/rpc/convay_force_start_meeting");
    expect(transport).toContain("body: JSON.stringify({ p_meeting_id: id })");
    expect(transport).toContain("receipt.status !== \"In Progress\"");
    expect(workspace).toContain("await convayAuth.forceStartMeeting(meetingId)");
    expect(workspace).toContain("if (access.loaded && access.is_super_admin)");
    expect(workspace).toContain('setPhase("prejoin")');
    expect(lobby).toContain("Force Start Now");
    expect(lobby).toContain("joinBlockedReason && !meetingClosed && onForceStart");
  });
  it("SQL verifies active super_admin identity, stamps the actor and creates exactly one live session", () => {
    expect(sql).toContain("account_role='super_admin'");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("security definer set search_path to ''");
    expect(sql).toContain("grant execute on function public.convay_force_start_meeting(text) to authenticated");
    expect(sql).toContain("admin_force_started_by");
    expect(sql).toContain("require_started_meeting_session()");
    expect(sql).toContain("convay.admin_force_start");
    expect(sql).toContain("v_total<>0");
    expect(sql).toContain("'bms.liveSessions'");
    expect(sql).toContain("v_meeting.payload->>'started_by'<>v_actor::text");
  });
  it("does not change the normal role/window permission for ordinary meeting starters", () => {
    expect(sql).toContain("if not v_is_force and (v_now < v_scheduled_at - interval '15 minutes'");
    expect(sql).toContain("not v_is_force and not convay_private.is_meeting_leader");
    expect(sql).toContain("Only an active Super Admin may force-start a meeting");
    expect(workspace).toContain("await convayAuth.applyBatch(operations)");
    expect(sql).toContain("Closed or cancelled meetings cannot be force-started");
  });
});
