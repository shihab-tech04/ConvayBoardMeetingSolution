import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeRecordedQuorum } from "../app/pages/archive-reports/recordedQuorumStatus";

describe("AR-05 — preserve unknown quorum history as unverified", () => {
  it("accepts only explicit quorum outcomes", () => {
    for (const value of ["Yes", "yes", "Met", " met "]) expect(normalizeRecordedQuorum(value)).toBe("Met");
    for (const value of ["No", "no", "Not Met", " not met "]) expect(normalizeRecordedQuorum(value)).toBe("Not Met");
  });
  it("never silently treats unknown or missing evidence as a failed quorum", () => {
    for (const value of ["", "Pending", "Unknown", "N/A", "false", "0", null, undefined, 0, false]) {
      expect(normalizeRecordedQuorum(value)).toBe("Unverified");
    }
  });
  it("reuses recorded-quorum interpretation in the existing historical record tab", () => {
    const page = readFileSync("src/app/pages/archive-reports/MeetingRecordPage.tsx", "utf8");
    expect(page).toContain('normalizeRecordedQuorum(q.quorum_met)');
    expect(page).not.toContain('q.quorum_met === "Yes" ? "Met" : "Not Met"');
    expect(page).toContain('<SectionCard title={`Quorum Events');
    expect(page).toContain('<StatusPill value={normalizeRecordedQuorum(q.quorum_met)} />');
  });
});
