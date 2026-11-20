import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildResolutionRegisterFilters } from "../app/pages/archive-reports/resolutionRegisterView";

const resolution = {
  id: "r1", resolution_id: "R-001", source_meeting: "M-1", resolution_type: "Ordinary",
  approval_status: "Adopted", vote_result: "Passed", effective_date: "2026-11-01",
};

const page = readFileSync("src/app/pages/archive-reports/RegisterPages.tsx", "utf8");
const resolutionSection = page.slice(page.indexOf("export function ResolutionRegisterPage()"), page.indexOf("export function DecisionRegisterPage()"));

describe("AR-12 — Resolution Register SQL-backed list accuracy", () => {
  it("offers only resolution-specific fields, not unrelated meeting filters", () => {
    const filters = buildResolutionRegisterFilters([resolution]);
    expect(filters.filter(f => f.type === "select").map(f => f.key)).toEqual([
      "source_meeting", "resolution_type", "approval_status", "vote_result",
    ]);
    expect(filters.map(f => f.key)).not.toContain("meeting_type");
    expect(filters.map(f => f.key)).not.toContain("committee");
  });
  it("preserves actual values and All reset, with stable sorted options", () => {
    const rows = [resolution, { ...resolution, source_meeting: "M-2" }, { ...resolution, source_meeting: " " }];
    expect(buildResolutionRegisterFilters(rows).find(f => f.key === "source_meeting")?.options).toEqual(["All", "M-1", "M-2"]);
  });
  it("deduplicates case variants and trims blanks", () => {
    const filters = buildResolutionRegisterFilters([resolution, { ...resolution, resolution_type: "ordinary " }, { ...resolution, approval_status: " " }]);
    expect(filters.find(f => f.key === "resolution_type")?.options).toEqual(["All", "Ordinary"]);
    expect(filters.find(f => f.key === "approval_status")?.options).toEqual(["All", "Adopted"]);
  });
  it("does not add out-of-scope or synthetic filter options for empty SQL result", () => {
    const filters = buildResolutionRegisterFilters([]);
    expect(filters.filter(f => f.type === "select").every(f => JSON.stringify(f.options) === '["All"]')).toBe(true);
  });
  it("does not modify SQL rows or derive values from unrelated records", () => {
    const before = JSON.stringify(resolution);
    buildResolutionRegisterFilters([resolution]);
    expect(JSON.stringify(resolution)).toBe(before);
  });
  it("preserves the shared effective-date range filters", () => {
    expect(buildResolutionRegisterFilters([resolution]).filter(f => f.type === "date").map(f => f.key)).toEqual(["from", "to"]);
  });
  it("reports loading, error and retry without false zero totals", () => {
    expect(resolutionSection).toContain("filters: buildResolutionRegisterFilters(rows)");
    expect(resolutionSection).toContain("dataLoading: registry.loading");
    expect(resolutionSection).toContain("dataError: registry.error");
    expect(resolutionSection).toContain("onDataRetry: registry.refresh");
    expect(resolutionSection).toContain("kpis: registry.loading || registry.error ? [] : kpis");
    expect(resolutionSection).not.toContain("filters: BASE_FILTERS");
  });
  it("preserves established visible columns, details and row action", () => {
    for (const column of ["resolution_title", "source_meeting", "proposed_by", "vote_result", "effective_date", "approval_status"]) {
      expect(resolutionSection).toContain('"'+column+'"');
    }
    expect(resolutionSection).toContain("drawerCols: RESOLUTION_DRAWER_COLS");
    expect(resolutionSection).toContain("actions: ROW_VIEW");
  });
});
