import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countOverdueActions, isActionClosed, todayInLocalTime } from "../app/pages/archive-reports/actionRegisterView";

const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
const page = source.slice(source.indexOf("export function DecisionsActionsAnalyticsPage()"), source.indexOf("export function FinancialResourceImpactPage()"));

describe("RP-04 decisions and actions analytics scope and source truth", () => {
  it("reuses already verified action closure and cancellation rules", () => {
    expect(isActionClosed({ implementation_status: "Closed" })).toBe(true);
    expect(countOverdueActions([{ due_date: "2026-11-01", approval_status: "Cancelled", implementation_status: "In Progress" }], "2026-11-20")).toBe(0);
    expect(countOverdueActions([{ due_date: "2026-11-01", implementation_status: "Closed" }], "2026-11-20")).toBe(0);
    expect(countOverdueActions([{ due_date: "2026-11-01", implementation_status: "In Progress" }], "2026-11-20")).toBe(1);
  });
  it("computes overdue with local date and terminal status instead of UTC", () => {
    expect(page).toContain("countOverdueActions(linked.map(a => ({ ...a })), todayInLocalTime(new Date()))");
    expect(page).not.toContain("new Date().toISOString().slice(0, 10)");
    expect(page).toContain("linked.filter(a => isActionClosed({ ...a })).length");
    expect(todayInLocalTime(new Date(2026, 10, 20))).toBe("2026-11-20");
  });
  it("requires both authoritative SQL reads before presenting figures", () => {
    expect(page).toContain("dataLoading: Boolean(decisionReg.loading || actionReg.loading)");
    expect(page).toContain("dataError: decisionReg.error ?? actionReg.error ?? null");
    expect(page).toContain("await Promise.all([decisionReg.refresh?.(), actionReg.refresh?.()])");
    expect(page).toContain("kpis: decisionReg.loading || actionReg.loading || decisionReg.error || actionReg.error ? [] : kpis");
  });
  it("preserves existing decisions, actions, columns and display controls", () => {
    expect(page).toContain("filters:    buildDecisionRegisterFilters(rows)");
    expect(page).toContain("drawerCols:  DECISION_DRAWER_COLS");
    for (const name of ["decision_title", "source_meeting", "decision_owner", "effective_date", "linked_actions", "completed_actions", "implementation_status", "approval_status"]) expect(page).toContain(name);
    expect(page).toContain("mobileCardMapping:");
    expect(page).toContain("actions:    ROW_VIEW");
  });
});
