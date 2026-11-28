import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const start = source.indexOf("export function ParticipationAnalyticsPage()");
const stop = source.indexOf("export function GovernanceReportPage()");
const page = source.slice(start, stop);

describe("RP-02 participation analytics SQL read-state integrity", () => {
  it("uses the permission-scoped report source and retains existing data fields", () => {
    expect(page).toContain("const registry = useScopedParticipationReport()");
    for (const field of ["participant_count", "quorum_forecast", "approval_status", "mode", "meeting_date", "recorded_check_ins"]) {
      expect(page).toContain(field);
    }
    expect(page).not.toContain("gen(");
    expect(page).toContain("recordedSessionCheckIns(registry.items)");
  });
  it("blocks misleading empty results and KPI totals until SQL read succeeds", () => {
    expect(page).toContain("dataLoading: Boolean(registry.loading)");
    expect(page).toContain("dataError: registry.error ?? null");
    expect(page).toContain("onDataRetry: registry.refresh");
    expect(page).toContain("kpis: registry.loading || registry.error ? [] : kpis");
  });
  it("retains existing report columns, filters, drawer and mobile fields", () => {
    for (const name of ["Total Meetings", "Total Participants", "Avg Per Meeting", "In-Person", "Virtual", "Participation Analytics"]) {
      expect(page).toContain(name);
    }
    expect(page).toContain("filters:    buildMeetingRegisterFilters(rows)");
    expect(page).toContain('m.meeting_date.slice(0, 4)');
    expect(page).not.toContain("BASE_FILTERS");
    expect(page).toContain("drawerCols:  [...MEETING_DRAWER_COLS");
    expect(page).toContain('fc("participation_summary","Participants"');
    expect(page).toContain('fc("participant_count", "Planned Participants")');
    expect(page).toContain('fc("recorded_check_ins", "Recorded Check-ins")');
    expect(page).toContain("mobileCardMapping:");
  });
});
