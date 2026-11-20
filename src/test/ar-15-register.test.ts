import { describe, it, expect } from "vitest";
import { buildAttendanceRegisterFilters } from "../app/pages/archive-reports/attendanceRegisterView";

const row = {"id": "t1", "meeting_id": "M-1", "attendance_mode": "Physical", "quorum_eligible": "Yes", "signed": "No"};

describe("AR-15 — Attendance Register", () => {
  it("lists meaningful fields, never irrelevant generic meeting filters", () => {
    const filters = buildAttendanceRegisterFilters([row]);
    expect(filters.filter(f => f.type === "select").map(f => f.key)).toEqual(["meeting_id", "attendance_mode", "quorum_eligible", "signed"]);
    expect(filters.map(f => f.key).not.toContain("meeting_type"));
    expect(filters.map(f => f.key).not.toContain("committee"));
  });
  it("uses scoped values and a working All reset", () => {
    const key = "meeting_id";
    const filters = buildAttendanceRegisterFilters([row, { ...row, [key]: "M-2" }, { ...row, [key]: "  " }]);
    const options = filters.find(f => f.key === key)?.options ?? [];
    expect(options[0]).toBe("All");
    expect(options).not.toContain("  ");
    expect(options).toContain(String(row[key as keyof typeof row]));
  });
  it("does not invent filters from unapproved or out-of-scope rows", () => {
    const filters = buildAttendanceRegisterFilters([]);
    expect(filters.every(f => f.type === "date" || JSON.stringify(f.options) === '["All"]')).toBe(true);
  });
  it("avoids repeated case-variant options", () => {
    const filters = buildAttendanceRegisterFilters([row, { ...row, meeting_id: String(row.meeting_id).toUpperCase() }]);
    expect(filters.find(f => f.key === "meeting_id")?.options).toHaveLength(2);
  });
  it("preserves accurate select filters without invented date", () => {
    const filters = buildAttendanceRegisterFilters([row]);
    expect(filters.filter(f => f.type === "date").map(f => f.key)).toEqual([]);
  });
});
