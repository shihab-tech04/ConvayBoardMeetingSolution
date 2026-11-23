import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasReportableFinancialImpact } from "../app/pages/archive-reports/financialImpactReportView";
import { buildDecisionRegisterFilters } from "../app/pages/archive-reports/decisionRegisterView";

const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const page = source.slice(source.indexOf("export function FinancialResourceImpactPage()"));

describe("RP-05 financial and resource impact report", () => {
  it("retains real impact strings including zero without inventing totals", () => {
    for (const impact of ["৳50,000,000", "0", "BDT 1500", "  Resource allocation  "]) {
      expect(hasReportableFinancialImpact(impact)).toBe(true);
    }
  });

  it("does not report missing, whitespace or case-varied N/A as financial impact", () => {
    for (const impact of [undefined, null, 0, false, "", " ", "N/A", " n/a ", "N/a"]) {
      expect(hasReportableFinancialImpact(impact)).toBe(false);
    }
  });

  it("reuses the exact SQL-scoped decision filters, not irrelevant meeting-type dimensions", () => {
    const rows = [
      { source_meeting: "MTG-1", decision_owner: "CFO", implementation_status: "Pending", approval_status: "Adopted" },
      { source_meeting: "MTG-1", decision_owner: " cfo ", implementation_status: "Completed", approval_status: "Adopted" },
    ];
    const filters = buildDecisionRegisterFilters(rows);
    expect(filters.map(f => f.key)).toEqual([
      "source_meeting", "decision_owner", "implementation_status", "approval_status", "from", "to",
    ]);
    expect(filters.find(f => f.key === "decision_owner")?.options).toEqual(["All", "CFO"]);
    expect(page).toContain("filters:    buildDecisionRegisterFilters(rows)");
    expect(page).not.toContain("filters:    BASE_FILTERS");
  });

  it("only presents confirmed KPIs and an empty result after SQL read succeeds", () => {
    expect(page).toContain("const decisionReg = useDecisionRegistry()");
    expect(page).toContain("decisionReg.items.filter(d => hasReportableFinancialImpact(d.financial_impact))");
    expect(page).toContain("dataLoading: Boolean(decisionReg.loading)");
    expect(page).toContain("dataError: decisionReg.error ?? null");
    expect(page).toContain("onDataRetry: decisionReg.refresh");
    expect(page).toContain("kpis: decisionReg.loading || decisionReg.error ? [] : kpis");
  });

  it("preserves report table, currency text, mobile mapping, drawer and actions", () => {
    for (const name of ["decision_id", "decision_title", "source_meeting", "decision_owner",
      "financial_impact", "effective_date", "implementation_status", "approval_status"]) {
      expect(page).toContain(name);
    }
    for (const label of ["Decisions with Financial Impact", "Implemented", "Pending Implementation"]) {
      expect(page).toContain(label);
    }
    expect(page).toContain("drawerCols:  DECISION_DRAWER_COLS");
    expect(page).toContain("mobileCardMapping:");
    expect(page).toContain('amount:     "financial_impact"');
    expect(page).toContain("actions:    ROW_VIEW");
  });
});
