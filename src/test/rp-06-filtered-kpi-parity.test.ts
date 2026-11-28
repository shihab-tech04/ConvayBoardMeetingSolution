import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { summarizeParticipantCounts } from "../app/pages/archive-reports/participantCountSummary";

const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const shared = readFileSync("src/app/components/pages/GeneratedTablePage.tsx", "utf8");

describe("RP-06 filtered summary parity and RP-02 count integrity", () => {
  it("preserves valid totals, zero and average", () => {
    expect(summarizeParticipantCounts(["3", 0, "6"])).toEqual({ totalParticipants: 9, avgParticipants: 3 });
    expect(summarizeParticipantCounts([])).toEqual({ totalParticipants: 0, avgParticipants: 0 });
  });
  it.each([null, undefined, "", "4x", -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects unknown or malformed count %s", value => {
    expect(summarizeParticipantCounts([2, value])).toEqual({ totalParticipants: null, avgParticipants: null });
  });
  it("rejects unsafe accumulated totals", () => {
    expect(summarizeParticipantCounts([Number.MAX_SAFE_INTEGER, 1])).toEqual({ totalParticipants: null, avgParticipants: null });
  });
  it("opts in only the three row-based analytics summaries, before pagination", () => {
    expect(source.match(/filteredKpis: summarize/g)).toHaveLength(3);
    expect(shared).toContain("cfg.filteredKpis?.(filtered) ?? cfg.kpis");
    expect(shared.indexOf("const visibleKpis =")).toBeLessThan(shared.indexOf("const pageRows ="));
    expect(shared).toContain("<CollapsibleKpiSection kpis={visibleKpis}");
  });
});
