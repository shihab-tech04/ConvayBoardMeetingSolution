import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMeetingRegisterFilters } from "../app/pages/return-register/meetingRegisterReadiness";

const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const meetings = [
  { meeting_type: "Regular", committee: "Audit", meeting_year: "2026" },
  { meeting_type: "Special", committee: "Board", meeting_year: "2027" },
  { meeting_type: "Regular", committee: "Audit", meeting_year: "2026" },
];
describe("RP-06 meeting analytics filter dimensions", () => {
  it("uses only real authorized options and preserves all five filter controls", () => {
    const filters = buildMeetingRegisterFilters(meetings);
    expect(filters.map(f => f.key)).toEqual(["meeting_type", "committee", "meeting_year", "from", "to"]);
    expect(filters.slice(0, 3).map(f => f.options)).toEqual([
      ["All", "Regular", "Special"], ["All", "Audit", "Board"], ["All", "2027", "2026"],
    ]);
  });
  it("does not offer fabricated choices for empty authorized data", () => {
    expect(buildMeetingRegisterFilters([]).slice(0, 3).map(f => f.options)).toEqual([["All"], ["All"], ["All"]]);
  });
  it("binds both analytics pages to the same filter contract and stored calendar year", () => {
    for (const [start, end] of [["MeetingPerformanceAnalyticsPage", "ParticipationAnalyticsPage"], ["ParticipationAnalyticsPage", "GovernanceReportPage"]]) {
      const page = source.slice(source.indexOf(`export function ${start}`), source.indexOf(`export function ${end}`));
      expect(page).toContain("filters:    buildMeetingRegisterFilters(rows)");
      expect(page).toContain('m.meeting_date.slice(0, 4)');
      expect(page).not.toContain("BASE_FILTERS");
    }
  });
});
