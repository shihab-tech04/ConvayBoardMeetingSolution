import { describe, expect, it } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";
import { meetingStartWindowState } from "../app/utils/meetingStartWindow";

const meeting = {
  meeting_id: "MTG-MT22",
  approval_status: "Published",
  chairperson_user_id: "chair-1",
  organizer_user_id: "organizer-1",
  meeting_date: "2026-11-06",
  start_time: "10:00",
  time_zone: "Asia/Dhaka (GMT+6)",
};

function context(now: Date): ActionContext {
  return {
    entity: "meeting",
    record: { ...meeting },
    currentUser: { id: "organizer-1", name: "Organizer" },
    userRole: "Meeting Organizer",
    meetingRoles: ["organizer"],
    permissions: ["mtg_view", "mtg_start"],
    now,
  };
}

describe("MT-22 scheduled meeting start window", () => {
  it("uses the saved IANA timezone and includes both 15-minute early and 2-hour late boundaries", () => {
    expect(meetingStartWindowState(meeting, new Date("2026-11-06T03:45:00.000Z"))).toBe("available");
    expect(meetingStartWindowState(meeting, new Date("2026-11-06T03:44:59.999Z"))).toBe("too-early");
    expect(meetingStartWindowState(meeting, new Date("2026-11-06T06:00:00.000Z"))).toBe("available");
    expect(meetingStartWindowState(meeting, new Date("2026-11-06T06:00:00.001Z"))).toBe("closed");
  });

  it("matches PostgreSQL standard-time selection for an ambiguous daylight-saving time", () => {
    const repeatedLondonTime = {
      meeting_date: "2026-10-25",
      start_time: "01:30",
      time_zone: "Europe/London (GMT+0/+1)",
    };
    expect(meetingStartWindowState(repeatedLondonTime, new Date("2026-10-24T23:00:00.000Z"))).toBe("too-early");
  });

  it("fails closed when the saved schedule or timezone is invalid", () => {
    expect(meetingStartWindowState({ ...meeting, meeting_date: "2026-02-30" }, new Date("2026-11-06T04:00:00Z"))).toBe("invalid");
    expect(meetingStartWindowState({ ...meeting, time_zone: "Not/A_Zone" }, new Date("2026-11-06T04:00:00Z"))).toBe("invalid");
  });

  it("enables Start only for a published meeting in the saved timezone window", () => {
    const action = resolveMeetingActions(context(new Date("2026-11-06T04:00:00.000Z"))).find(item => item.id === "start");
    expect(action?.visible).toBe(true);
    expect(action?.enabled).toBe(true);
  });

  it("explains that a start window has closed without changing the existing action layout", () => {
    const action = resolveMeetingActions(context(new Date("2026-11-06T06:01:00.000Z"))).find(item => item.id === "start");
    expect(action?.visible).toBe(true);
    expect(action?.enabled).toBe(false);
    expect(action?.disabledReason).toContain("ended 2 hours after");
  });
});
