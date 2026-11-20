import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildMinutesRevisionRequest, canArchiveMinutes, canEditMinutesContent,
  canRequestMinutesRevision, canSignMinutes,
} from "../app/pages/archive-reports/minutesRecordActions";

describe("MN-09/MN-13 — Meeting Record minutes lifecycle preflight", () => {
  const statuses = [
    "Draft", "Under Secretary Review", "Under Chairperson Review", "Member Review",
    "Revision Requested", "Approved", "Signed", "Archived", "Rejected", "",
  ];

  it("only offers signing from the already-approved stage with reviewer permission", () => {
    for (const status of statuses) {
      expect(canSignMinutes(status, true)).toBe(status === "Approved");
      expect(canSignMinutes(status, false)).toBe(false);
    }
  });

  it("only offers revision requests during a review stage for a reviewer", () => {
    const review = new Set(["Under Secretary Review", "Under Chairperson Review", "Member Review"]);
    for (const status of statuses) {
      expect(canRequestMinutesRevision(status, true)).toBe(review.has(status));
      expect(canRequestMinutesRevision(status, false)).toBe(false);
    }
  });

  it("requires meaningful instructions and preserves their trimmed text", () => {
    expect(buildMinutesRevisionRequest("Member Review", true, "  Correct the meeting date  "))
      .toEqual({ approval_status: "Revision Requested", revision_instructions: "Correct the meeting date" });
    for (const reason of [null, undefined, "", "  ", "Too short", "123456789"]) {
      expect(() => buildMinutesRevisionRequest("Member Review", true, reason)).toThrow(/10 characters/);
    }
    for (const status of ["Draft", "Approved", "Signed", "Archived", "Revision Requested"]) {
      expect(() => buildMinutesRevisionRequest(status, true, "Correct the meeting date")).toThrow(/only be requested/);
    }
    expect(() => buildMinutesRevisionRequest("Member Review", false, "Correct the meeting date"))
      .toThrow(/authorized reviewer/);
  });

  it("only allows editing Draft or Revision Requested with author permission", () => {
    for (const status of statuses) {
      expect(canEditMinutesContent(status, true)).toBe(status === "Draft" || status === "Revision Requested");
      expect(canEditMinutesContent(status, false)).toBe(false);
    }
  });

  it("only allows archiving Signed minutes with reviewer permission", () => {
    for (const status of statuses) {
      expect(canArchiveMinutes(status, true)).toBe(status === "Signed");
      expect(canArchiveMinutes(status, false)).toBe(false);
    }
  });

  it("keeps the existing record tab but gates each action and confirms saved state", () => {
    const page = readFileSync("src/app/pages/archive-reports/MeetingRecordPage.tsx", "utf8");
    expect(page).toContain("canSignMinutes(m.approval_status, canApproveMinutes)");
    expect(page).toContain("canRequestMinutesRevision(m.approval_status, canApproveMinutes)");
    expect(page).toContain("buildMinutesRevisionRequest(latest?.approval_status, canApproveMinutes, revisionInstructions)");
    expect(page).toContain("canEditMinutesContent(latest?.approval_status, canEditMinutes)");
    expect(page).toContain("canArchiveMinutes(latest?.approval_status, canApproveMinutes)");
    expect(page).toContain("if (saved === false) throw new Error");
    expect(page).toContain("await minutesReg.refresh?.()");
    expect(page).toContain("Revision instructions (minimum 10 characters)");
    expect(page).toContain("Record Internal Signature");
    expect(page).not.toContain('m.approval_status !== "Signed" && m.approval_status !== "Archived"');
    expect(page).not.toContain('minutesReg.update(m.id, { approval_status: "Revision Requested" })');
    expect(page).toContain("const canEditMinutes = access.loaded");
  });
});
