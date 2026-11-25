import { describe, it, expect } from "vitest";
import { buildActionRegisterFilters, isActionCancelled, isActionClosed, isActionOpen, countOverdueActions, todayInLocalTime } from "../app/pages/archive-reports/actionRegisterView";

const row = {"id": "a1", "source_meeting": "M-1", "assigned_to": "Secretary", "priority": "High", "implementation_status": "Open", "due_date": "2026-11-01"};

describe("AR-14 — Action Register", () => {
  it("lists meaningful fields, never irrelevant generic meeting filters", () => {
    const filters = buildActionRegisterFilters([row]);
    expect(filters.filter(f => f.type === "select").map(f => f.key)).toEqual(["source_meeting", "assigned_to", "priority", "implementation_status"]);
    expect(filters.map(f => f.key)).not.toContain("meeting_type");
    expect(filters.map(f => f.key)).not.toContain("committee");
  });
  it("uses scoped values and a working All reset", () => {
    const key = "source_meeting";
    const filters = buildActionRegisterFilters([row, { ...row, [key]: "M-2" }, { ...row, [key]: "  " }]);
    const options = filters.find(f => f.key === key)?.options ?? [];
    expect(options[0]).toBe("All");
    expect(options).not.toContain("  ");
    expect(options).toContain(String(row[key as keyof typeof row]));
  });
  it("does not invent filters from unapproved or out-of-scope rows", () => {
    const filters = buildActionRegisterFilters([]);
    expect(filters.every(f => f.type === "date" || JSON.stringify(f.options) === '["All"]')).toBe(true);
  });
  it("avoids repeated case-variant options", () => {
    const filters = buildActionRegisterFilters([row, { ...row, source_meeting: String(row.source_meeting).toUpperCase() }]);
    expect(filters.find(f => f.key === "source_meeting")?.options).toHaveLength(2);
  });
  it("preserves date range using real due_date", () => {
    const filters = buildActionRegisterFilters([row]);
    expect(filters.filter(f => f.type === "date").map(f => f.key)).toEqual(["from", "to"]);
  });
});

describe("AR-14 — overdue and closure semantics", () => {
  it("uses browser-local civil day, not UTC date boundaries", () => {
    const date = new Date(2026, 10, 7, 0, 15);
    expect(todayInLocalTime(date)).toBe("2026-11-07");
  });
  it("excludes completed and closed actions from open/overdue", () => {
    expect(isActionClosed({ implementation_status: "Completed" })).toBe(true);
    expect(isActionClosed({ action_status: "Closed" })).toBe(true);
    expect(isActionClosed({ implementation_status: "In Progress" })).toBe(false);
  });
  it("counts only genuinely overdue, open ISO-dated actions", () => {
    expect(countOverdueActions([
      { due_date: "2026-11-05", implementation_status: "In Progress" },
      { due_date: "2026-11-05", implementation_status: "Completed" },
      { due_date: "2026-11-05", action_status: "Closed" },
      { due_date: "2026-11-07", implementation_status: "Open" },
      { due_date: "", implementation_status: "Open" },
      { due_date: "TBD", implementation_status: "Open" },
    ], "2026-11-07")).toBe(1);
  });
});

describe("AR-14 — calendar-valid overdue and cancelled lifecycle precedence", () => {
  it("does not count impossible calendar dates as overdue", () => {
    const dueDates = ["2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "0000-01-01"];
    expect(countOverdueActions(dueDates.map(due_date => ({ due_date, implementation_status: "Open" })), "2026-11-23")).toBe(0);
  });

  it("accepts real leap days and excludes invalid century leap days", () => {
    const dueDates = ["2024-02-29", "2000-02-29", "1900-02-29"];
    expect(countOverdueActions(dueDates.map(due_date => ({ due_date, implementation_status: "Open" })), "2026-11-23")).toBe(2);
  });

  it("does not mark cancelled actions as completed, open or overdue when old fields conflict", () => {
    const cancelled = [
      { due_date: "2026-11-01", implementation_status: "Completed", approval_status: "Cancelled" },
      { due_date: "2026-11-01", action_status: "Closed", completion_status: "Canceled" },
      { due_date: "2026-11-01", implementation_status: "In Progress", completion_status: "Cancelled" },
    ];
    for (const action of cancelled) {
      expect(isActionCancelled(action)).toBe(true);
      expect(isActionClosed(action)).toBe(false);
      expect(isActionOpen(action)).toBe(false);
    }
    expect(countOverdueActions(cancelled, "2026-11-23")).toBe(0);
    expect(isActionClosed({ implementation_status: "Completed", approval_status: "Approved" })).toBe(true);
  });

  it("never treats a malformed reference date as overdue evidence", () => {
    expect(countOverdueActions([{ due_date: "2026-11-01", implementation_status: "Open" }], "2026-11-31")).toBe(0);
    expect(countOverdueActions([{ due_date: "2026-11-01", implementation_status: "Open" }], "")).toBe(0);
    expect(countOverdueActions([{ due_date: "2026-11-01", implementation_status: "Open" }], "2026-11-23")).toBe(1);
  });
});
