import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { recordListState } from "../app/pages/archive-reports/recordListState";

const src = readFileSync("src/app/pages/archive-reports/MeetingRecordPage.tsx", "utf8");
const attendance = src.slice(src.indexOf("  const renderParticipants = () => ("), src.indexOf("  const renderQuorum = () => ("));

describe("AR-04 SQL-authoritative historical participation and attendance", () => {
  it("distinguishes two independent record stores without hiding permission failures", () => {
    expect(src).toContain("recordListState(Boolean(participantReg.loading), participantReg.error, meetingParticipants.length)");
    expect(src).toContain("recordListState(Boolean(attendanceReg.loading), attendanceReg.error, meetingAttendance.length)");
    expect(recordListState(true, "permission denied", 2)).toBe("error");
    expect(recordListState(true, null, 2)).toBe("loading");
    expect(recordListState(false, null, 0)).toBe("empty");
  });
  it("shows honest status, retry and intact table layout for each registry", () => {
    expect(attendance).toContain('participantHistoryState === "loading"');
    expect(attendance).toContain('participantHistoryState === "error"');
    expect(attendance).toContain('participantHistoryState === "empty"');
    expect(attendance).toContain('attendanceHistoryState === "loading"');
    expect(attendance).toContain('attendanceHistoryState === "error"');
    expect(attendance).toContain('attendanceHistoryState === "empty"');
    expect((attendance.match(/role="status"/g) || [])).toHaveLength(2);
    expect((attendance.match(/role="alert"/g) || [])).toHaveLength(2);
    expect(attendance).toContain("participantReg.refresh?.()");
    expect(attendance).toContain("attendanceReg.refresh?.()");
    expect(attendance).toContain("RSVP</TH>");
    expect(attendance).toContain("Check-Out</TH>");
    expect(attendance).not.toContain("{meetingParticipants.length === 0 ? (");
    expect(attendance).not.toContain("{meetingAttendance.length === 0 ? (");
  });
  it("preserves protected minutes lifecycle from released PR #136/#138", () => {
    expect(src).toContain("buildMinutesRevisionRequest");
    expect(src).toContain("canSignMinutes");
    expect(src).toContain("canArchiveMinutes");
    expect(src).toContain("canEditMinutesContent");
    expect(src).toContain("if (saved === false) return;");
  });
});
