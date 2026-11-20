import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/pages/archive-reports/MeetingArchivePage.tsx", "utf8");

describe("AR-01 Meeting Archive SQL-backed summary truth", () => {
  it("uses only its existing authorized meeting registry for archive records", () => {
    expect(page).toContain("const registry = useMeetingRegistry()");
    expect(page).toContain('const ARCHIVE_STATUSES = ["Completed", "Archived", "Minutes Approved", "Awaiting Minutes", "Closed"]');
    expect(page).toContain("ARCHIVE_STATUSES.includes(String(m.approval_status ?? \"\"))");
  });

  it("does not falsely report zero KPIs before a successful SQL read", () => {
    expect(page).toContain("dataLoading: Boolean(registry.loading)");
    expect(page).toContain("dataError: registry.error ?? null");
    expect(page).toContain("onDataRetry: async () => { await registry.refresh?.(); }");
    expect(page).toContain("kpis: registry.loading || registry.error ? [] : kpis");
  });

  it("preserves the archive table, navigation, labels, drawer and mobile mapping", () => {
    for (const label of ["Archived Meetings", "Awaiting Minutes", "Completed", "Minutes Approved"]) {
      expect(page).toContain(label);
    }
    for (const field of ["meeting_title", "committee", "meeting_date", "chairperson",
      "participant_count", "approval_status", "meeting_id"]) {
      expect(page).toContain(field);
    }
    expect(page).toContain("mobileCardMapping:");
    expect(page).toContain("filters:  BASE_FILTERS");
    expect(page).toContain("drawerCols: MEETING_DRAWER_COLS");
    expect(page).toContain('id: "view_record"');
    expect(page).toContain("navigate(archiveRecordPath(row.id ?? row.meeting_id))");
  });
});
