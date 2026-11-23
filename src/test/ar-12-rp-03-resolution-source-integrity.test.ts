import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolutionSourceMeetingId, resolutionBelongsToMeeting } from "../app/pages/archive-reports/resolutionRegisterView";

const register = readFileSync("src/app/pages/archive-reports/RegisterPages.tsx", "utf8");
const analytics = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const resolutionPart = register.slice(register.indexOf("export function ResolutionRegisterPage()"), register.indexOf("export function DecisionRegisterPage()"));
const reportPart = analytics.slice(analytics.indexOf("export function GovernanceReportPage()"), analytics.indexOf("export function DecisionsActionsAnalyticsPage()"));

describe("WS-C AR-12 / RP-03 — resolution source meeting readback", () => {
  it("shows a trusted legacy meeting_id when source_meeting was never written", () => {
    expect(resolutionSourceMeetingId({ meeting_id: "MTG-42" })).toBe("MTG-42");
    expect(resolutionBelongsToMeeting({ meeting_id: "MTG-42" }, "MTG-42")).toBe(true);
    expect(resolutionBelongsToMeeting({ meeting_id: "MTG-42" }, "MTG-99")).toBe(false);
  });

  it("keeps an existing canonical source_meeting without replacing it", () => {
    expect(resolutionSourceMeetingId({ source_meeting: "MTG-10" })).toBe("MTG-10");
    expect(resolutionSourceMeetingId({ source_meeting: "MTG-10", meeting_id: "MTG-10" })).toBe("MTG-10");
    expect(resolutionBelongsToMeeting({ source_meeting: "MTG-10", meeting_id: "MTG-10" }, " MTG-10 ")).toBe(true);
  });

  it("fails closed on two different nonempty source identifiers", () => {
    const conflict = { source_meeting: "MTG-1", meeting_id: "MTG-2" };
    expect(resolutionSourceMeetingId(conflict)).toBe("");
    expect(resolutionBelongsToMeeting(conflict, "MTG-1")).toBe(false);
    expect(resolutionBelongsToMeeting(conflict, "MTG-2")).toBe(false);
  });

  it("never assigns empty, malformed or non-string source identifiers to a meeting", () => {
    const cases = [
      {}, { source_meeting: " ", meeting_id: "" }, { source_meeting: null, meeting_id: undefined },
      { source_meeting: 123, meeting_id: false },
    ];
    for (const value of cases) {
      expect(resolutionSourceMeetingId(value)).toBe("");
      expect(resolutionBelongsToMeeting(value, "")).toBe(false);
      expect(resolutionBelongsToMeeting(value, "MTG-42")).toBe(false);
    }
  });

  it("does not edit underlying records or invent adoption or vote result", () => {
    const record = { id: "r1", meeting_id: "MTG-42", approval_status: "Passed", vote_result: "", votes_for: "1" };
    const before = JSON.stringify(record);
    expect(resolutionSourceMeetingId(record)).toBe("MTG-42");
    expect(resolutionBelongsToMeeting(record, "MTG-42")).toBe(true);
    expect(JSON.stringify(record)).toBe(before);
    expect(record.approval_status).toBe("Passed");
    expect(record.vote_result).toBe("");
  });

  it("wires the register row and governance per-body count to the same verified source resolver", () => {
    expect(resolutionPart).toContain("source_meeting: resolutionSourceMeetingId(r)");
    expect(resolutionPart).toContain("filters: buildResolutionRegisterFilters(rows)");
    expect(resolutionPart).toContain("drawerCols: RESOLUTION_DRAWER_COLS");
    expect(resolutionPart).toContain('r.approval_status === "Adopted"');
    expect(reportPart).toContain("bodyMeetings.some(m => resolutionBelongsToMeeting(r, m.meeting_id))");
    expect(reportPart).toContain('r.approval_status === "Adopted"');
    expect(reportPart).toContain("resolutionReg.loading");
    expect(reportPart).toContain("resolutionReg.error");
  });
});
