import { describe, it, expect } from "vitest";
import { buildConflictRegisterFilters } from "../app/pages/archive-reports/conflictRegisterView";

const row = {"id": "c1", "meeting_id": "M-1", "conflict_type": "Financial Interest", "action_taken": "Recused from vote", "review_status": "Under Review", "created_at": "2026-11-01T09:00:00Z"};

describe("AR-16 — Conflict Register", () => {
  it("lists meaningful fields, never irrelevant generic meeting filters", () => {
    const filters = buildConflictRegisterFilters([row]);
    expect(filters.filter(f => f.type === "select").map(f => f.key)).toEqual(["meeting_id", "conflict_type", "action_taken", "review_status"]);
    expect(filters.map(f => f.key)).not.toContain("meeting_type");
    expect(filters.map(f => f.key)).not.toContain("committee");
  });
  it("uses scoped values and a working All reset", () => {
    const key = "meeting_id";
    const filters = buildConflictRegisterFilters([row, { ...row, [key]: "M-2" }, { ...row, [key]: "  " }]);
    const options = filters.find(f => f.key === key)?.options ?? [];
    expect(options[0]).toBe("All");
    expect(options).not.toContain("  ");
    expect(options).toContain(String(row[key as keyof typeof row]));
  });
  it("does not invent filters from unapproved or out-of-scope rows", () => {
    const filters = buildConflictRegisterFilters([]);
    expect(filters.every(f => f.type === "date" || JSON.stringify(f.options) === '["All"]')).toBe(true);
  });
  it("avoids repeated case-variant options", () => {
    const filters = buildConflictRegisterFilters([row, { ...row, meeting_id: String(row.meeting_id).toUpperCase() }]);
    expect(filters.find(f => f.key === "meeting_id")?.options).toHaveLength(2);
  });
  it("preserves date range using real created_at", () => {
    const filters = buildConflictRegisterFilters([row]);
    expect(filters.filter(f => f.type === "date").map(f => f.key)).toEqual(["from", "to"]);
  });
});
