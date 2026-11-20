import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchesSelectedDocumentMeeting as match } from "../app/pages/agenda-documents/documentLibraryMeetingFilter";

describe("DC-06 Document Library Related Meeting filter and meeting cell", () => {
  it("matches a canonical meeting ID to its complete selected ID/title option", () => {
    expect(match("MTG-2026-0010","MTG-2026-0010 — Executive Board")).toBe(true);
  });
  it("matches the legacy related-meeting ID/title value", () => {
    expect(match("MTG-2026-0010 — Executive Board","MTG-2026-0010 — Executive Board")).toBe(true);
    expect(match("MTG-2026-0010 — Different title","MTG-2026-0010 — Executive Board")).toBe(true);
  });
  it("rejects shorter ID prefix collisions regardless of record ordering", () => {
    expect(match("MTG-2026-00100","MTG-2026-0010 — Board")).toBe(false);
    expect(match("MTG-2026-0010","MTG-2026-001 — Another Board")).toBe(false);
    expect(match("MTG-2026-001 — Old","MTG-2026-0010 — New")).toBe(false);
  });
  it("rejects unrelated meetings and malformed selections", () => {
    expect(match("MTG-2026-0010","MTG-2026-0009 — Other")).toBe(false);
    expect(match("MTG-2026-0010","garbage")).toBe(false);
    expect(match(null,"MTG-2026-0010 — Board")).toBe(false);
  });
  it("preserves unset and All filter inclusiveness", () => {
    expect(match("MTG-2026-0010",undefined)).toBe(true);
    expect(match("MTG-2026-0010","All")).toBe(true);
    expect(match(null,"All")).toBe(true);
  });
  it("fails closed for a partial or empty canonical meeting identifier", () => {
    expect(match("MTG-2026-0010","MTG-2026-001")).toBe(false);
    expect(match("MTG-2026-0010"," — Untitled")).toBe(false);
  });
  it("wires exact meeting filter and exact meeting/agenda cell resolution", () => {
    const src=readFileSync("src/app/pages/agenda-documents/DocumentLibraryPage.tsx","utf8");
    expect(src).toContain("matchesSelectedDocumentMeeting(row.related_meeting, applied.related_meeting)");
    expect(src).toContain("matchesExactDocumentLinkReference(mtgId, m.meeting_id)");
    expect(src).toContain("matchesExactDocumentLinkReference(agdId, a.agenda_id)");
    expect(src).not.toContain("row.related_meeting.startsWith(id)");
    expect(src).not.toContain("mtgId.startsWith(m.meeting_id)");
    expect(src).not.toContain("agdId.startsWith(a.agenda_id)");
  });
});
