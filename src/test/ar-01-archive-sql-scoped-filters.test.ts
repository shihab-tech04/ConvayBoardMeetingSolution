import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMeetingRegisterFilters } from "../app/pages/return-register/meetingRegisterReadiness";

const page = readFileSync("src/app/pages/archive-reports/MeetingArchivePage.tsx", "utf8");

describe("AR-01 Meeting Archive — actual SQL-scoped filter options", () => {
  const archived = [
    { id: "a", meeting_type: "Regular", committee: "Board", meeting_year: "2026", meeting_date: "2026-11-20" },
    { id: "b", meeting_type: "Special", committee: "Audit", meeting_year: "2027", meeting_date: "2027-01-08" },
    { id: "c", meeting_type: "Regular", committee: "Board", meeting_year: "2026", meeting_date: "2026-12-02" },
  ];

  it("offers only authorized archive dimensions in the original label and filter order", () => {
    const filters = buildMeetingRegisterFilters(archived);
    expect(filters.map(f => f.key)).toEqual(["meeting_type", "committee", "meeting_year", "from", "to"]);
    expect(filters.find(f => f.key === "meeting_type")?.options).toEqual(["All", "Regular", "Special"]);
    expect(filters.find(f => f.key === "committee")?.options).toEqual(["All", "Audit", "Board"]);
    expect(filters.find(f => f.key === "meeting_year")?.options).toEqual(["All", "2027", "2026"]);
    expect(filters.filter(f => f.type === "date").map(f => f.key)).toEqual(["from", "to"]);
  });

  it("does not show unrelated static options for a genuine empty SQL result", () => {
    expect(buildMeetingRegisterFilters([]).filter(f => f.type === "select").map(f => f.options)).toEqual([["All"], ["All"], ["All"]]);
  });

  it("derives the archive meeting year from its stored calendar date and never fiscal-year guesses", () => {
    expect(page).toContain('meeting_year: /^\\d{4}-\\d{2}-\\d{2}(?:$|T)/.test(m.meeting_date)');
    expect(page).toContain('m.meeting_date.slice(0, 4)');
    expect(page).toContain('filters:  buildMeetingRegisterFilters(archived)');
    expect(page).not.toContain('filters:  BASE_FILTERS');
  });

  it("preserves the previously released SQL/error/metrics and archive record-navigation journey", () => {
    expect(page).toContain('const registry = useMeetingRegistry()');
    expect(page).toContain('kpis: registry.loading || registry.error ? [] : kpis');
    expect(page).toContain('dataError: registry.error ?? null');
    expect(page).toContain('onDataRetry: async () => { await registry.refresh?.(); }');
    expect(page).toContain('navigate(archiveRecordPath(row.id ?? row.meeting_id))');
    for (const field of ['mobileCardMapping:', 'drawerCols: MEETING_DRAWER_COLS', 'approval_status', 'meeting_title']) {
      expect(page).toContain(field);
    }
  });
});
