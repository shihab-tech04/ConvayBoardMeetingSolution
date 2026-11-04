import { describe, expect, it } from "vitest";
import { dashboardCalendarWindow, isMeetingApprovalPending } from "../app/pages/dashboard/dashboardOverviewRules";

describe("HM-01 executive overview calendar and status", () => {
  it("uses the browser's local calendar date, not a UTC date", () => {
    const result = dashboardCalendarWindow(new Date(2026, 10, 5, 0, 15));
    expect(result.today).toBe("2026-11-05");
    expect(result.weekEnd).toBe("2026-11-12");
  });

  it("crosses month and year boundaries correctly", () => {
    expect(dashboardCalendarWindow(new Date(2026, 11, 29, 23, 50))).toEqual({
      today: "2026-12-29",
      weekEnd: "2027-01-05",
    });
  });

  it("does not shift due dates after daylight-saving calendar changes", () => {
    const now = new Date(2026, 2, 7, 23, 30);
    const window = dashboardCalendarWindow(now);
    expect(window).toEqual({ today: "2026-03-07", weekEnd: "2026-03-14" });
  });

  it("counts actual meeting approvals but excludes minutes preparation", () => {
    expect(isMeetingApprovalPending("Pending Approval")).toBe(true);
    expect(isMeetingApprovalPending("Awaiting Approval")).toBe(true);
    for (const status of ["Awaiting Minutes", "Draft", "Approved", "Completed", "Cancelled", null]) {
      expect(isMeetingApprovalPending(status)).toBe(false);
    }
  });
});
