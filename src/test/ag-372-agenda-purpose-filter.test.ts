import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { agendaPurposeMatches, normalizeAgendaPurpose } from "../app/pages/register-stock/agendaPurposeFilter";
import { collectAgendaRegisterDescendants } from "../app/pages/register-stock/agendaRegisterDescendants";

describe("AG-372 Agenda purpose filters across parent/child/third-level hierarchy", () => {
  const rows = [
    { id:"parent", display_order:1, purpose:"For Information", parent_agenda_id:null },
    { id:"child", display_order:1, purpose:"For Approval", parent_agenda_id:"parent" },
    { id:"grandchild", display_order:1, purpose:"For Review", parent_agenda_id:"child" },
  ];
  const parentPurposes = [rows[0].purpose, ...collectAgendaRegisterDescendants(rows[0].id,rows).map(row=>row.purpose)];

  it("matches parent and both descendant levels without flattening or changing displayed records", () => {
    expect(agendaPurposeMatches(parentPurposes,"For Information")).toBe(true);
    expect(agendaPurposeMatches(parentPurposes,"For Approval")).toBe(true);
    expect(agendaPurposeMatches(parentPurposes,"For Review")).toBe(true);
    expect(agendaPurposeMatches(parentPurposes,"For Decision")).toBe(false);
  });
  it("retains old purpose casing/whitespace while rejecting prefix-only matches", () => {
    expect(normalizeAgendaPurpose("  For   Review  ")).toBe("for review");
    expect(agendaPurposeMatches(["for approval"," For   noting "],"For Approval")).toBe(true);
    expect(agendaPurposeMatches(["for approval"," For   noting "],"For noting")).toBe(true);
    expect(agendaPurposeMatches(["For Review Extra"],"For Review")).toBe(false);
    expect(agendaPurposeMatches([undefined,null],"For Discussion")).toBe(false);
    expect(agendaPurposeMatches([],"")).toBe(true);
  });
  it("integrates with the existing parent table and approved filter UI without a redesign", () => {
    const src=readFileSync("src/app/pages/register-stock/Register4ListPage.tsx","utf8");
    expect(src).toContain("_purpose_values: [parent.purpose, ...children.map(child => child.purpose)]");
    expect(src).toContain("agendaPurposeMatches(r._purpose_values ?? [], allApplied.purpose_filter)");
    expect(src).toContain('options: ["For Information", "For Discussion", "For Review", "For Approval", "For Decision", "For noting"]');
    expect(src).toContain('purpose_filter:  parent.purpose ?? ""');
    expect(src).not.toContain('"For discussion", "For approval", "For information", "For review"');
  });
});
