import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { ResolvedAction } from "../app/actions/types";
import { liveMeetingRoute, liveMeetingUrl, liveMeetingInvitation } from "../app/utils/liveMeetingLink";
import { resolveMeetingStartCardState } from "../app/pages/dashboard/liveMeetingCardActions";
import { meetingAccessBlockers } from "../app/pages/return-register/meetingAccess";

const action = (id: string, enabled: boolean, visible = true, disabledReason?: string) =>
  ({ id, enabled, visible, disabledReason, label: id, placement: "direct", priority: 1 } as ResolvedAction);

describe("LM/HM: every meeting card uses real LiveKit, not fake deterministic rooms", () => {
  it("points saved ID to the actual same-origin app route with GitHub Pages basename", () => {
    expect(liveMeetingRoute("MTG-2026-0001")).toBe("/meetings/MTG-2026-0001/live?entry=join_meeting");
    expect(liveMeetingRoute("MTG/বাংলা", "start_meeting")).toContain("/meetings/MTG%2F");
    const link = liveMeetingUrl("MTG-2026-0001", "https://shihab-tech04.github.io", "/ConvayBoardMeetingSolution/");
    expect(link).toBe("https://shihab-tech04.github.io/ConvayBoardMeetingSolution/meetings/MTG-2026-0001/live?entry=join_meeting");
    expect(link).not.toContain("pwd=");
    expect(liveMeetingUrl("  ", "https://shihab-tech04.github.io")).toBeNull();
    expect(liveMeetingUrl("MTG-1", "javascript:alert(1)")).toBeNull();
  });

  it("sends only signed-in instructions and no fabricated password", () => {
    const invite = liveMeetingInvitation("MTG-2026-0001", "https://shihab-tech04.github.io", "/ConvayBoardMeetingSolution/");
    expect(invite).toContain("LiveKit");
    expect(invite).toContain("Sign in with your authorized account.");
    expect(invite).toContain("MTG-2026-0001/live?entry=join_meeting");
    expect(invite).not.toMatch(/Password:|pwd=|app\.convay\.com/);
  });

  it("does not demand a fake link before an actual ID exists", () => {
    expect(meetingAccessBlockers({mode:"Virtual",virtual_platform:"LiveKit",virtual_link:""})).toEqual([]);
    expect(meetingAccessBlockers({mode:"Hybrid",venue:"Room",virtual_platform:"LiveKit",virtual_link:""})).toEqual([]);
    expect(meetingAccessBlockers({mode:"Hybrid",venue:"",virtual_platform:"LiveKit",virtual_link:""}))
      .toEqual(["Hybrid meeting requires a venue address"]);
    expect(meetingAccessBlockers({mode:"Virtual",virtual_link:""}))
      .toEqual(["Virtual meeting requires a virtual meeting link"]);
  });

  it("only launches authorized start when published and within window", () => {
    const meeting = { approval_status:"Published",meeting_date:"2026-11-23",start_time:"10:00",time_zone:"Asia/Dhaka (GMT+6)" };
    const now = new Date("2026-11-23T04:00:00Z");
    const permitted = resolveMeetingStartCardState(meeting,[action("start",true)],now);
    expect(permitted).toMatchObject({enabled:true,label:"Start Meeting Now",entryAction:"start_meeting"});
    expect(resolveMeetingStartCardState(meeting,[action("start",false,true,"Wait for start window")],now))
      .toMatchObject({enabled:false,entryAction:null,disabledReason:"Wait for start window"});
    expect(resolveMeetingStartCardState(meeting,[action("start",true,false)],now).enabled).toBe(false);
    expect(resolveMeetingStartCardState({ ...meeting, approval_status: "Scheduled" }, [], now).enabled).toBe(false);
  });

  it("never starts a scheduled, expired, or unauthorized meeting", () => {
    const now = new Date("2026-11-23T10:00:00Z");
    const scheduled = {approval_status:"Scheduled",meeting_date:"2026-11-23",start_time:"10:00",time_zone:"Asia/Dhaka (GMT+6)"};
    const blocked = resolveMeetingStartCardState(scheduled,[],now);
    expect(blocked.enabled).toBe(false);
    expect(blocked.disabledReason).toMatch(/Reschedule and publish/);
    expect(resolveMeetingStartCardState({ ...scheduled, approval_status:"Draft" },[],now).enabled).toBe(false);
    expect(resolveMeetingStartCardState({ ...scheduled, approval_status:"In Progress" },[action("continue_meeting",true)],now))
      .toMatchObject({enabled:true,label:"Continue Live Meeting",entryAction:"continue_meeting"});
  });

  it("keeps invitees in the waiting lobby until a host creates the SQL live session", () => {
    const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    const prejoin = readFileSync("src/app/components/meetings/MeetingPreJoinPanel.tsx", "utf8");
    expect(workspace).toContain("activeJoinSessions.length === 0");
    expect(workspace).toContain("joinBlockedReason={joinBlockedReason}");
    expect(workspace).toContain("if (joinBlockedReason) { toast.info(joinBlockedReason); return; }");
    expect(workspace).toContain("refreshLiveSessions?.()");
    expect(prejoin).toContain('disabled={Boolean(joinBlockedReason)}');
    expect(prejoin).toContain('role="status"');
  });

  it("uses the authorized SQL ID across create, edit, dashboard and review", () => {
    const create = readFileSync("src/app/pages/return-register/OnlineReturnRegisterPage.tsx","utf8");
    const projection = readFileSync("src/app/components/forms/QuorumAndAccessPanel.tsx","utf8");
    const dashboard = readFileSync("src/app/pages/dashboard/DashboardPage.tsx","utf8");
    const review = readFileSync("src/app/components/forms/MeetingReviewPanel.tsx","utf8");
    expect(create).toContain("liveMeetingUrl(newId)");
    expect(create).toContain("liveMeetingInvitation(savedId)");
    expect(create).toContain("LiveKit Meeting");
    expect(projection).not.toContain("generateConvayMeeting");
    expect(create).not.toContain("app.convay.com");
    expect(dashboard).toContain("getStartAction={getStartNowAction}");
    expect(dashboard).toContain("<StartMeetingCardButton action={startAction}");
    expect(dashboard).toContain("liveMeetingUrl(mid)");
    expect(dashboard).not.toContain("href={str(m.virtual_link)}");
    expect(review).toContain("LiveKit Join Link");
  });
});
