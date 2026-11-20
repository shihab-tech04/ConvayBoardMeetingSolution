import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { matchesExactDocumentLinkReference as match } from "../app/components/documents/documentLinkedRecordReference";

describe("DC document related meeting/agenda identity", () => {
  it("accepts complete canonical meeting IDs", () => {
    expect(match("MTG-2026-0010","MTG-2026-0010")).toBe(true);
  });
  it("does not allow a shorter meeting ID to hijack a longer one", () => {
    expect(match("MTG-2026-0010","MTG-2026-001")).toBe(false);
    expect(match("MTG-2026-001","MTG-2026-0010")).toBe(false);
  });
  it("accepts already-supported ID and title display form", () => {
    expect(match("MTG-2026-0010 — Board Meeting","MTG-2026-0010")).toBe(true);
    expect(match("AGD-2026-0035 — Budget","AGD-2026-0035")).toBe(true);
  });
  it("rejects ambiguous concatenation, bogus delimiter, and partial IDs", () => {
    expect(match("MTG-2026-0010 — Board","MTG-2026-001")).toBe(false);
    expect(match("MTG-2026-0010 random","MTG-2026-0010")).toBe(false);
    expect(match("MTG-2026-00100","MTG-2026-0010")).toBe(false);
  });
  it("does not incorrectly associate a parent agenda to a child agenda", () => {
    expect(match("AGD-2026-00351","AGD-2026-0035")).toBe(false);
    expect(match("AGD-2026-0035","AGD-2026-0035")).toBe(true);
  });
  it("fails closed for empty, malformed or noncanonical candidate IDs", () => {
    expect(match("", "MTG-1")).toBe(false);
    expect(match(null, "MTG-1")).toBe(false);
    expect(match("MTG-1", null)).toBe(false);
    expect(match("MTG-1"," MTG-1")).toBe(false);
    expect(match("MTG-1","")).toBe(false);
  });
  it("preserves both drawer tabs by applying the exact matcher four times", () => {
    const source=readFileSync("src/app/components/documents/DocumentDetailsDrawer.tsx","utf8");
    expect(source.match(/matchesExactDocumentLinkReference\(doc\.related_meeting, m\.meeting_id\)/g)).toHaveLength(2);
    expect(source.match(/matchesExactDocumentLinkReference\(doc\.related_agenda, a\.agenda_id\)/g)).toHaveLength(2);
    expect(source).not.toContain("doc.related_meeting.startsWith(m.meeting_id)");
    expect(source).not.toContain("doc.related_agenda.startsWith(a.agenda_id)");
  });
});
