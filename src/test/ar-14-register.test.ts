import { describe, it, expect } from "vitest";
import { buildActionRegisterFilters, isActionClosed, countOverdueActions, todayInLocalTime } from "../app/pages/archive-reports/actionRegisterView";

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
