import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { matchesDocumentGovernanceBody } from "../app/pages/agenda-documents/documentLibraryGovernanceFilter";

const meetings = [
  {meeting_id: "MTG-001", governance_body: "Audit Committee", committee: "Legacy Name"},
  {meeting_id: "MTG-002", committee: "Board of Directors"},
  {meeting_id: "MTG-003", committee: "Risk Committee"},
];

describe("DC document library — Governance Body filter", () => {
  it("filters using canonical governance body", () => {
    expect(matchesDocumentGovernanceBody("MTG-001", "Audit Committee", meetings)).toBe(true);
    expect(matchesDocumentGovernanceBody("MTG-001", "Legacy Name", meetings)).toBe(false);
  });
  it("falls back to existing meeting committee metadata", () => {
    expect(matchesDocumentGovernanceBody("MTG-002", "Board of Directors", meetings)).toBe(true);
    expect(matchesDocumentGovernanceBody("MTG-002", "Audit Committee", meetings)).toBe(false);
  });
  it("supports the already displayed meeting ID plus title value", () => {
    expect(matchesDocumentGovernanceBody("MTG-003 — Budget Meeting", "Risk Committee", meetings)).toBe(true);
  });
  it("does not use unsafe prefix matching", () => {
    expect(matchesDocumentGovernanceBody("MTG-0012", "Audit Committee", meetings)).toBe(false);
  });
  it("fails closed for missing or orphaned meeting references", () => {
    expect(matchesDocumentGovernanceBody("", "Audit Committee", meetings)).toBe(false);
    expect(matchesDocumentGovernanceBody(null, "Audit Committee", meetings)).toBe(false);
    expect(matchesDocumentGovernanceBody("missing", "Audit Committee", meetings)).toBe(false);
  });
  it("keeps the All Committees default inclusive", () => {
    expect(matchesDocumentGovernanceBody("", "All Committees", meetings)).toBe(true);
    expect(matchesDocumentGovernanceBody("MTG-001", "", meetings)).toBe(true);
  });
  it("is actually applied by DocumentLibraryPage, not only a dead helper", () => {
    const source = readFileSync("src/app/pages/agenda-documents/DocumentLibraryPage.tsx", "utf8");
    expect(source).toContain("matchesDocumentGovernanceBody(row.related_meeting, applied.governance_body, meetings)");
    expect(source).toContain("meetingReg.items)");
  });
});
