import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveMinutesSource, validateMinutesRevisionRequest, isEditableMinutesStatus } from "../app/pages/archive-reports/minutesSourceIntegrity";

const sourceMeeting = {
  id: "meeting-uuid-1", meeting_id: "MTG-2026-0001", meeting_title: "Annual Board Meeting",
  meeting_date: "2026-11-01", approval_status: "Awaiting Minutes",
};

describe("MN-01 minutes source integrity", () => {
  it("carries the authoritative meeting ID/title/date into a new draft", () => {
    expect(resolveMinutesSource("MTG-2026-0001", "Annual Board Meeting", [sourceMeeting]))
      .toEqual({ meeting_id: "MTG-2026-0001", meeting_title: "Annual Board Meeting", meeting_date: "2026-11-01" });
  });
  it("rejects incorrect, inaccessible and mismatched meeting references", () => {
    expect(() => resolveMinutesSource("", "Annual Board Meeting", [sourceMeeting])).toThrow();
    expect(() => resolveMinutesSource("MTG-other-tenant", "Annual Board Meeting", [sourceMeeting])).toThrow();
    expect(() => resolveMinutesSource("MTG-2026-0001", "Wrong Meeting", [sourceMeeting])).toThrow();
  });
  it("rejects unfinished and already approved meeting contexts", () => {
    for (const status of ["Draft", "In Progress", "Paused", "Minutes Approved"]) {
      expect(() => resolveMinutesSource("MTG-2026-0001", "Annual Board Meeting", [
        { ...sourceMeeting, approval_status: status },
      ])).toThrow();
    }
  });
  it("accepts a review-only revision with substantive instructions", () => {
    for (const stage of ["Under Secretary Review", "Under Chairperson Review", "Member Review"]) {
      expect(validateMinutesRevisionRequest(stage, "  Revise the recorded attendance  ")).toBe("Revise the recorded attendance");
    }
  });
  it("rejects draft, approved, signed and archived revision requests and short instructions", () => {
    for (const status of ["Draft", "Revision Requested", "Approved", "Signed", "Archived"]) {
      expect(() => validateMinutesRevisionRequest(status, "Change attendance details")).toThrow(/review/);
    }
    for (const instructions of ["", "  ", "Too short", null]) {
      expect(() => validateMinutesRevisionRequest("Under Secretary Review", instructions)).toThrow(/10 characters/);
    }
  });
  it("permits draft and returned-for-revision editing but protects finalized minutes", () => {
    expect(isEditableMinutesStatus("Draft")).toBe(true);
    expect(isEditableMinutesStatus("Revision Requested")).toBe(true);
    for (const status of ["Under Secretary Review", "Under Chairperson Review", "Member Review", "Approved", "Signed", "Archived"]) {
      expect(isEditableMinutesStatus(status)).toBe(false);
    }
  });
  it("connects the revision action to awaited SQL and the shared permission gate", () => {
    const page = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    expect(page).toContain('requestRevisionPermission: "min_approve"');
    expect(page).toContain('async onRequestRevision(id, instructions)');
    expect(page).toContain("validateMinutesRevisionRequest(original.approval_status, instructions)");
    expect(page).toContain("const saved = await registry.update(id, revisionPatch)");
    expect(page).toContain('if (saved !== true) throw new Error(');
  });
  it("requires permission, confirmed SQL create and immutable meeting linkage on edit", () => {
    const page = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    expect(page).toContain('access.effective_permissions.includes("min_create")');
    expect(page).toContain('const saved = await registry.add(');
    expect(page).toContain('if (saved !== true) throw new Error(');
    expect(page).toContain("!isEditableMinutesStatus(original.approval_status)");
    expect(page).toContain('const saved = await registry.update(id, {');
  });
});
