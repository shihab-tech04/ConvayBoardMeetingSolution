import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { AgendaSubmission } from "../app/data/boardMeetingData";
import {
  hasUnapprovedActiveAgendaDescendant,
  isAgendaMeetingReady,
  validateOptionalMeetingAgendas,
} from "../app/pages/return-register/meetingAgendaSelection";

const agenda = (
  id: string,
  status: string,
  parent: string | null = null,
  options: { archived_at?: string; meeting_readiness?: string; agenda_id?: string } = {},
) => ({
  id, agenda_id: options.agenda_id ?? id, agenda_title: id,
  parent_agenda_id: parent, approval_status: status,
  archived_at: options.archived_at ?? "",
  meeting_readiness: options.meeting_readiness ?? (status === "Approved" ? "Meeting Ready" : "Not Ready"),
}) as unknown as AgendaSubmission;

const choose = (id: string) => [{ agenda_id: id, display_order: 1 }];

describe("AG-369 Meeting Agenda UI and SQL recursive readiness parity", () => {
  it("accepts a fully approved parent, child and grandchild", () => {
    const p = agenda("P", "Approved");
    const rows = [p, agenda("C", "Approved", "P"), agenda("G", "Approved", "C")];
    expect(hasUnapprovedActiveAgendaDescendant(p, rows)).toBe(false);
    expect(isAgendaMeetingReady(p, rows)).toBe(true);
    expect(validateOptionalMeetingAgendas(choose("P"), rows)).toEqual([]);
  });

  it("rejects a parent with an unapproved grandchild even when direct child is Approved", () => {
    const p = agenda("P", "Approved");
    const rows = [p, agenda("C", "Approved", "P"), agenda("G", "Draft", "C")];
    expect(hasUnapprovedActiveAgendaDescendant(p, rows)).toBe(true);
    expect(isAgendaMeetingReady(p, rows)).toBe(false);
    expect(validateOptionalMeetingAgendas(choose("P"), rows)[0]).toMatch(/Approved and Meeting Ready/);
  });

  it("uses both record ID and agenda_id for legacy parent references", () => {
    const p = agenda("parent-row", "Approved", null, { agenda_id: "AGD-P" });
    const c = agenda("child-row", "Approved", "AGD-P", { agenda_id: "AGD-C" });
    const g = agenda("grandchild-row", "Rejected", "child-row");
    expect(hasUnapprovedActiveAgendaDescendant(p, [p, c, g])).toBe(true);
    expect(isAgendaMeetingReady(p, [p, c, g])).toBe(false);
  });

  it("matches SQL archived_at semantics and still traverses archived ancestors", () => {
    const p = agenda("P", "Approved");
    const c = agenda("C", "Archived", "P", { archived_at: "2026-11-24T00:00:00Z" });
    const g = agenda("G", "Draft", "C");
    expect(isAgendaMeetingReady(p, [p, c, g])).toBe(false);
    const archivedGrandchild = { ...g, archived_at: "2026-11-24T00:00:00Z" };
    expect(isAgendaMeetingReady(p, [p, c, archivedGrandchild])).toBe(true);
  });

  it("rejects explicit non-ready flags and stops on malformed cyclic references", () => {
    const p = agenda("P", "Approved", null, { meeting_readiness: "Not Ready" });
    expect(isAgendaMeetingReady(p, [p])).toBe(false);
    const valid = agenda("P", "Approved");
    const cyclic = agenda("C", "Approved", "P");
    const extra = agenda("G", "Draft", "C");
    expect(isAgendaMeetingReady(valid, [valid, cyclic, extra])).toBe(false);
    const bad = { ...cyclic, parent_agenda_id: "C" };
    expect(hasUnapprovedActiveAgendaDescendant(valid, [valid, bad])).toBe(false);
  });

  it("uses the shared recursive helper in the picker without changing approved controls", () => {
    const src = readFileSync("src/app/components/forms/AgendaDocumentStep.tsx", "utf8");
    expect(src).toContain("hasUnapprovedActiveAgendaDescendant(agenda, allAgendas)");
    expect(src).toContain('label: "Partially Approved"');
    expect(src).toContain("isAgendaMeetingReady(agenda, allAgendas)");
    expect(src).toContain("Select Agendas (Optional)");
  });
});
