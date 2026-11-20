import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildGovernanceReportFilters } from "../app/pages/archive-reports/governanceReportView";

const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const section = source.slice(source.indexOf("export function GovernanceReportPage()"), source.indexOf("export function DecisionsActionsAnalyticsPage()"));
const body = { body_name: "Board", body_type: "Board", chairperson: "Chair A", status: "Active" };

describe("RP-03 governance analytics SQL truth", () => {
  it("filters real scoped governance fields instead of unrelated meeting types", () => {
    expect(buildGovernanceReportFilters([body]).map(f => f.key)).toEqual(["body_type", "chairperson", "status"]);
    expect(buildGovernanceReportFilters([body]).map(f => f.key)).not.toContain("meeting_type");
  });
  it("deduplicates case variants, ignores blanks and retains All reset", () => {
    const filters = buildGovernanceReportFilters([body, { ...body, body_type: " board " }, { ...body, status: " " }]);
    expect(filters.find(f => f.key === "body_type")?.options).toEqual(["All", "Board"]);
    expect(filters.find(f => f.key === "status")?.options).toEqual(["All", "Active"]);
  });
  it("does not invent dimensions when SQL reports no data", () => {
    expect(buildGovernanceReportFilters([]).every(f => JSON.stringify(f.options) === '["All"]')).toBe(true);
  });
  it("preserves all three scoped SQL inputs and synchronizes their load/error/retry", () => {
    for (const name of ["useMeetingRegistry()", "useGovernanceRegistry()", "useResolutionRegistry()"]) expect(section).toContain(name);
    expect(section).toContain("dataLoading: Boolean(meetingReg.loading || governanceReg.loading || resolutionReg.loading)");
    expect(section).toContain("dataError: meetingReg.error ?? governanceReg.error ?? resolutionReg.error ?? null");
    expect(section).toContain("await Promise.all([meetingReg.refresh?.(), governanceReg.refresh?.(), resolutionReg.refresh?.()])");
    expect(section).toContain("kpis: meetingReg.loading || governanceReg.loading || resolutionReg.loading || meetingReg.error || governanceReg.error || resolutionReg.error ? [] : kpis");
  });
  it("preserves existing columns, KPI labels and drawer/mobile layout", () => {
    expect(section).toContain("filters:    buildGovernanceReportFilters(rows)");
    expect(section).not.toContain("filters:    BASE_FILTERS");
    for (const column of ["body_name", "body_type", "chairperson", "member_count", "meetings_held", "resolutions_passed", "status"]) expect(section).toContain(column);
    for (const label of ["Governance Bodies", "Active", "Total Meetings", "Resolutions Adopted"]) expect(section).toContain(label);
    expect(section).toContain("drawerCols:  GOV_BODY_DRAWER_COLS");
    expect(section).toContain("mobileCardMapping:");
  });
});
