import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countOverdueActions, isActionCancelled, isActionClosed, isActionOpen } from "../app/pages/archive-reports/actionRegisterView";

const page = readFileSync("src/app/pages/archive-reports/RegisterPages.tsx", "utf8");
const section = (start: string, stop?: string) => page.slice(
  page.indexOf(`export function ${start}()`),
  stop ? page.indexOf(`export function ${stop}()`) : undefined,
);

describe("AR-13/14/15/16 restored live register integration", () => {
  it.each([
    ["DecisionRegisterPage", "ActionRegisterPage", "buildDecisionRegisterFilters"],
    ["ActionRegisterPage", "AttendanceRegisterPage", "buildActionRegisterFilters"],
    ["AttendanceRegisterPage", "ConflictRegisterPage", "buildAttendanceRegisterFilters"],
    ["ConflictRegisterPage", undefined, "buildConflictRegisterFilters"],
  ] as const)("wires scoped filters and honest server state in %s", (start, stop, helper) => {
    const part = section(start, stop);
    expect(part).toContain(`filters: ${helper}(rows)`);
    expect(part).toContain("dataLoading: registry.loading");
    expect(part).toContain("dataError: registry.error");
    expect(part).toContain("onDataRetry: registry.refresh");
    expect(part).toContain("kpis: registry.loading || registry.error ? [] : kpis");
    expect(part).not.toContain("filters: BASE_FILTERS");
  });

  it("preserves independently owned Resolution Register without redesign", () => {
    const part = section("ResolutionRegisterPage", "DecisionRegisterPage");
    expect(part).toContain("filters: BASE_FILTERS");
    expect(part).toContain("drawerCols: RESOLUTION_DRAWER_COLS");
    expect(part).toContain("actions: ROW_VIEW");
  });

  it("does not call canceled work completed, open or overdue", () => {
    const cancelled = { due_date: "2026-11-01", implementation_status: "In Progress", approval_status: "Cancelled" };
    expect(isActionCancelled(cancelled)).toBe(true);
    expect(isActionClosed(cancelled)).toBe(false);
    expect(isActionOpen(cancelled)).toBe(false);
    expect(countOverdueActions([cancelled], "2026-11-20")).toBe(0);
    expect(isActionOpen({ implementation_status: "In Progress", approval_status: "Open" })).toBe(true);
  });

  it("preserves closed/completed totals while excluding canceled from Open", () => {
    const part = section("ActionRegisterPage", "AttendanceRegisterPage");
    expect(part).toContain("rows.filter(r => isActionOpen(r)).length");
    expect(part).toContain("rows.filter(r => isActionClosed(r)).length");
    expect(part).toContain("countOverdueActions(rows, today)");
    expect(part).toContain("todayInLocalTime(new Date())");
  });
});
