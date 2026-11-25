import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildAgendaPreviewOutline } from "../app/pages/register-stock/agendaPreviewOutline";

const rows = [
  { id: "root", agenda_title: "Main", display_order: 1 },
  { id: "late", agenda_title: "Late", parent_agenda_id: "root", display_order: 2 },
  { id: "early", agenda_title: "Early", parent_agenda_id: "root", display_order: 1 },
  { id: "late-b", agenda_title: "Late B", parent_agenda_id: "late", display_order: 2 },
  { id: "early-a", agenda_title: "Early A", parent_agenda_id: "early", display_order: 1 },
  { id: "late-a", agenda_title: "Late A", parent_agenda_id: "late", display_order: 1 },
  { id: "unrelated", agenda_title: "Other meeting", parent_agenda_id: "other" },
];

describe("AG-17 Full Agenda Preview complete hierarchy", () => {
  it("renders all Level 2 and Level 3 rows in canonical depth-first sibling order", () => {
    expect(buildAgendaPreviewOutline("root", "3", rows).map(({ item, outline, level }) =>
      [item.id, outline, level])).toEqual([
      ["early", "3.1", 2],
      ["early-a", "3.1.1", 3],
      ["late", "3.2", 2],
      ["late-a", "3.2.1", 3],
      ["late-b", "3.2.2", 3],
    ]);
  });

  it("uses the parent index instead of assuming every preview begins at 1", () => {
    expect(buildAgendaPreviewOutline("root", "7", rows)[0].outline).toBe("7.1");
  });

  it("remains empty for a root without children", () => {
    expect(buildAgendaPreviewOutline("orphan", "1", rows)).toEqual([]);
  });

  it("ignores unrelated branches and duplicate source identifiers", () => {
    const projected = buildAgendaPreviewOutline("root", "1", [...rows,
      { id: "early", agenda_title: "Duplicate", parent_agenda_id: "late", display_order: -50 }]);
    expect(projected).toHaveLength(5);
    expect(projected.some(({item}) => item.id === "unrelated")).toBe(false);
    expect(projected.find(({item}) => item.id === "early")?.outline).toBe("1.1");
  });

  it("does not loop or repeat corrupt cyclic references", () => {
    const corrupt = [...rows, { id: "root", agenda_title: "Cycle", parent_agenda_id: "late-a" }];
    expect(buildAgendaPreviewOutline("root", "1", corrupt)).toHaveLength(5);
  });

  it("does not mutate the caller's source array or display orders", () => {
    const before = JSON.stringify(rows);
    buildAgendaPreviewOutline("root", "2", rows);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("wires the preview modal, summary totals, accessible outline and empty state to the same full rows", () => {
    const src = readFileSync("src/app/pages/register-stock/Register4ListPage.tsx","utf8");
    expect(src).toContain("buildAgendaPreviewOutline(pvParent.id, String(pvIdx + 1), allItems)");
    expect(src).toContain("...pvRows.map(row => row.item)");
    expect(src).toContain("pvRows.map(({ item: child, outline, level })");
    expect(src).toContain("aria-label={`Agenda ${outline}: ${child.agenda_title}`}");
    expect(src).toContain("{pvRows.length === 0 && (");
    expect(src).not.toContain("{pvChildren.map((child, ci) => (");
  });
});
