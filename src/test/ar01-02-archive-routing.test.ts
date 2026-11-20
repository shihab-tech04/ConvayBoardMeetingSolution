import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { archiveRecordPath } from "../app/pages/archive-reports/archiveRecordPath";

const archive = readFileSync("src/app/pages/archive-reports/MeetingArchivePage.tsx", "utf8");
const record = readFileSync("src/app/pages/archive-reports/MeetingRecordPage.tsx", "utf8");

describe("AR-01 and AR-02: archive navigation and truthful record states", () => {
  it("navigates to the exact canonical meeting ID, never a guessed display title", () => {
    expect(archiveRecordPath("mtg-2026-02")).toBe("/meetings/mtg-2026-02/record");
    expect(archiveRecordPath("550e8400-e29b-41d4-a716-446655440000"))
      .toBe("/meetings/550e8400-e29b-41d4-a716-446655440000/record");
    expect(archiveRecordPath("  MTG-5  ")).toBe("/meetings/MTG-5/record");
    expect(archiveRecordPath("MTG / 7?")).toBe("/meetings/MTG%20%2F%207%3F/record");
  });
  it("fails closed instead of navigating to a missing or unsafe record ID", () => {
    for (const value of [null, undefined, "", "  ", ".", "..", "\\u0000"]) {
      expect(() => archiveRecordPath(value)).toThrow(/ID/);
    }
  });
  it("keeps the existing table detail drawer and wires its visible full-record action", () => {
    expect(archive).toContain('...ROW_VIEW');
    expect(archive).toContain('id: "view_record"');
    expect(archive).toContain("navigate(archiveRecordPath(row.id ?? row.meeting_id))");
    expect(archive).toContain('drawerTitle: "Meeting Details"');
    expect(archive).toContain("dataLoading: Boolean(registry.loading)");
    expect(archive).toContain("dataError: registry.error ?? null");
    expect(archive).toContain("await registry.refresh?.()");
  });
  it("distinguishes an unfinished/failed SQL load from confirmed record absence", () => {
    expect(record).toContain("if (meetingReg.loading)");
    expect(record).toContain('role="status"');
    expect(record).toContain("if (meetingReg.error)");
    expect(record).toContain('role="alert"');
    expect(record).toContain("This does not mean the meeting was deleted.");
    expect(record).toContain("Retry Loading");
    expect(record.indexOf("if (meetingReg.loading)")).toBeLessThan(record.indexOf("if (!meeting)"));
    expect(record.indexOf("if (meetingReg.error)")).toBeLessThan(record.indexOf("if (!meeting)"));
    expect(record).toContain("Meeting Not Found");
  });
});
