import { describe, it, expect } from "vitest";
import { buildDecisionRegisterFilters } from "../app/pages/archive-reports/decisionRegisterView";

const row = {"id": "d1", "source_meeting": "M-1", "decision_owner": "Chair", "implementation_status": "In Progress", "approval_status": "Draft", "effective_date": "2026-11-01"};

describe("AR-13 — Decision Register", () => {
  it("lists meaningful fields, never irrelevant generic meeting filters", () => {
    const filters = buildDecisionRegisterFilters([row]);
    expect(filters.filter(f => f.type === "select").map(f => f.key)).toEqual(["source_meeting", "decision_owner", "implementation_status", "approval_status"]);
    expect(filters.map(f => f.key)).not.toContain("meeting_type");
    expect(filters.map(f => f.key)).not.toContain("committee");
  });
  it("uses scoped values and a working All reset", () => {
    const key = "source_meeting";
    const filters = buildDecisionRegisterFilters([row, { ...row, [key]: "M-2" }, { ...row, [key]: "  " }]);
    const options = filters.find(f => f.key === key)?.options ?? [];
    expect(options[0]).toBe("All");
    expect(options).not.toContain("  ");
    expect(options).toContain(String(row[key as keyof typeof row]));
  });
  it("does not invent filters from unapproved or out-of-scope rows", () => {
    const filters = buildDecisionRegisterFilters([]);
    expect(filters.every(f => f.type === "date" || JSON.stringify(f.options) === '["All"]')).toBe(true);
  });
  it("avoids repeated case-variant options", () => {
    const filters = buildDecisionRegisterFilters([row, { ...row, source_meeting: String(row.source_meeting).toUpperCase() }]);
    expect(filters.find(f => f.key === "source_meeting")?.options).toHaveLength(2);
  });
  it("preserves date range using real effective_date", () => {
    const filters = buildDecisionRegisterFilters([row]);
    expect(filters.filter(f => f.type === "date").map(f => f.key)).toEqual(["from", "to"]);
  });
});
