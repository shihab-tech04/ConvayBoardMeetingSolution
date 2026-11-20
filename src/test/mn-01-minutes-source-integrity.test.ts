import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveMinutesSource, validateMinutesRevisionRequest, isEditableMinutesStatus, buildMinutesReviewSubmission } from "../app/pages/archive-reports/minutesSourceIntegrity";

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
  it("submits an initial draft without changing its version", () => {
    expect(buildMinutesReviewSubmission("Draft", "1.0"))
      .toEqual({ approval_status: "Under Secretary Review", version: "1.0" });
  });
  it("increments only returned minutes by one minor version", () => {
    expect(buildMinutesReviewSubmission("Revision Requested", "1.0"))
      .toEqual({ approval_status: "Under Secretary Review", version: "1.1" });
    expect(buildMinutesReviewSubmission("Revision Requested", "2.19"))
      .toEqual({ approval_status: "Under Secretary Review", version: "2.20" });
  });
  it("rejects invalid status/version rather than forging a review transition", () => {
    for (const status of ["Under Secretary Review", "Member Review", "Approved", "Signed", "Archived", ""]) {
      expect(() => buildMinutesReviewSubmission(status, "1.0")).toThrow(/Only draft/);
    }
    for (const version of ["", "latest", "1.2.3", "1.-1", "01.0", "1.10000"]) {
      expect(() => buildMinutesReviewSubmission("Revision Requested", version)).toThrow(/version/);
    }
    expect(() => buildMinutesReviewSubmission("Revision Requested", "1.9999")).toThrow(/limit/);
  });
  it("keeps the resubmission modal explicit and waits for server persistence", () => {
    const page = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    expect(page).toContain('id: "submit_for_review"');
    expect(page).toContain("<SConfirmModal");
    expect(page).toContain("buildMinutesReviewSubmission(original.approval_status, original.version)");
    expect(page).toContain("const saved = await registry.update(id, patch)");
    expect(page).toContain("await registry.refresh?.()");
    expect(page).toContain("submissionInFlight.current");
  });
  it("connects the revision action to awaited SQL and the shared permission gate", () => {
    const page = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    expect(page).toContain('requestRevisionPermission: "min_approve"');
    expect(page).toContain('async onRequestRevision(id, instructions)');
    expect(page).toContain("validateMinutesRevisionRequest(original.approval_status, instructions)");
    expect(page).toContain("const saved = await registry.update(id, revisionPatch)");
    expect(page).toContain('if (saved !== true) throw new Error(');
  });
  it("keeps Additional Notes in both SQL create and SQL edit payloads", () => {
    const page = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    const sql = readFileSync("supabase/migrations/20261119183500_convay_minutes_source_integrity.sql", "utf8");
    expect(page).toContain('notes:              String(values.notes ?? "")');
    expect(page).toContain('notes: String(values.notes ?? "")');
    expect(sql).toContain("'notes',old.payload->>'notes'");
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
