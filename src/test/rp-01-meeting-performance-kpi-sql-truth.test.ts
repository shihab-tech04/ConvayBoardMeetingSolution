import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const page = source.slice(
  source.indexOf("export function MeetingPerformanceAnalyticsPage()"),
  source.indexOf("export function ParticipationAnalyticsPage()"),
);

describe("RP-01 Meeting Performance SQL-confirmed KPIs", () => {
  it("depends on both authoritative meeting and recorded quorum registries", () => {
    expect(page).toContain("const registry = useMeetingRegistry()");
    expect(page).toContain("const quorumReg = useQuorumEventRegistry()");
    expect(page).toContain("latestRecordedQuorumStatus(m.meeting_id, quorumReg.items)");
  });

  it("does not display misleading zero metrics until both SQL reads succeed", () => {
    expect(page).toContain("dataLoading: Boolean(registry.loading || quorumReg.loading)");
    expect(page).toContain("dataError: registry.error ?? quorumReg.error ?? null");
    expect(page).toContain("kpis: registry.loading || quorumReg.loading || registry.error || quorumReg.error ? [] : kpis");
  });

  it("keeps the existing scoped retry and approved report/table experience", () => {
    expect(page).toContain("await Promise.all([registry.refresh?.(), quorumReg.refresh?.()])");
    for (const label of ["Total Meetings", "Completed", "Scheduled", "Cancelled", "Quorum Met"]) {
      expect(page).toContain(label);
    }
    for (const field of ["meeting_id", "meeting_title", "committee", "meeting_date", "agenda_count",
      "participant_count", "quorum_observed", "approval_status"]) {
      expect(page).toContain(field);
    }
    expect(page).toContain("mobileCardMapping:");
    expect(page).toContain("filters:    BASE_FILTERS");
    expect(page).toContain("drawerCols:  MEETING_DRAWER_COLS");
    expect(page).toContain("actions:    ROW_VIEW");
  });
});
