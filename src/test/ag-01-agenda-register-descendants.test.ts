import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { collectAgendaRegisterDescendants, collectAgendaRegisterAncestors } from "../app/pages/register-stock/agendaRegisterDescendants";

const items = [
  { id: "p", display_order: 1 },
  { id: "a", parent_agenda_id: "p", display_order: 2 },
  { id: "b", parent_agenda_id: "p", display_order: 1 },
  { id: "b1", parent_agenda_id: "b", display_order: 1 },
  { id: "a1", parent_agenda_id: "a", display_order: 1 },
];
describe("AG-01 agenda register hierarchy projection", () => {
  it("includes direct and third-level descendants", () => {
    expect(collectAgendaRegisterDescendants("p", items).map(a => a.id)).toEqual(["b", "b1", "a", "a1"]);
  });
  it("excludes the root from its own descendants", () => {
    expect(collectAgendaRegisterDescendants("p", items).some(a => a.id === "p")).toBe(false);
  });
  it("does not mutate the caller's sort order", () => {
    const ids = items.map(a => a.id);
    collectAgendaRegisterDescendants("p", items);
    expect(items.map(a => a.id)).toEqual(ids);
  });
  it("returns no descendants if none are linked", () => {
    expect(collectAgendaRegisterDescendants("absent", items)).toEqual([]);
  });
  it("ignores unrelated subtrees", () => {
    const siblings = [...items, { id: "x", parent_agenda_id: "external" }];
    expect(collectAgendaRegisterDescendants("p", siblings).some(a => a.id === "x")).toBe(false);
  });
  it("prevents self-referential cycles", () => {
    expect(collectAgendaRegisterDescendants("p", [...items, { id: "p", parent_agenda_id: "a" }]).map(a=>a.id)).toEqual(["b", "b1", "a", "a1"]);
  });
  it("prevents multi-node cycles", () => {
    const cyclic = [...items, { id: "p", parent_agenda_id: "b1" }];
    expect(collectAgendaRegisterDescendants("p", cyclic).length).toBe(4);
  });
  it("deduplicates duplicate source IDs", () => {
    const repeated = [...items, { id: "a", parent_agenda_id: "p" }];
    expect(collectAgendaRegisterDescendants("p", repeated).map(a=>a.id)).toEqual(["b", "b1", "a", "a1"]);
  });
  it("keeps the first canonical sort position when a later duplicate has no order", () => {
    const duplicates = [...items, { id: "a", parent_agenda_id: "p" }];
    expect(collectAgendaRegisterDescendants("p", duplicates).map(a => a.id)).toEqual(["b", "b1", "a", "a1"]);
  });
  it("ignores a later duplicate that points to another parent", () => {
    const duplicates = [...items, { id: "b", parent_agenda_id: "a", display_order: -100 }];
    expect(collectAgendaRegisterDescendants("p", duplicates).map(a => a.id)).toEqual(["b", "b1", "a", "a1"]);
  });
  it("handles empty input", () => expect(collectAgendaRegisterDescendants("p", [])).toEqual([]));
});

describe("AG-01/08 canonical ancestor and view consistency", () => {
  it("returns only the true ancestor path, nearest parent first", () => {
    expect(collectAgendaRegisterAncestors("b1", items).map(x => x.id)).toEqual(["b", "p"]);
    expect(collectAgendaRegisterAncestors("a", items).map(x => x.id)).toEqual(["p"]);
    expect(collectAgendaRegisterAncestors("p", items)).toEqual([]);
  });

  it("rejects an orphan and does not borrow an unrelated hierarchy", () => {
    const foreign = [...items, { id: "orphan", parent_agenda_id: "missing" }];
    expect(collectAgendaRegisterAncestors("orphan", foreign)).toEqual([]);
    expect(collectAgendaRegisterAncestors("unseen", foreign)).toEqual([]);
  });

  it("refuses a self-parent before applying an approval cascade", () => {
    const malformed = [{ id: "x", parent_agenda_id: "x" }, ...items];
    expect(collectAgendaRegisterAncestors("x", malformed)).toEqual([]);
  });

  it("refuses the whole ancestor chain if any step closes a cycle", () => {
    const malformed = [
      { id: "root", parent_agenda_id: "child" },
      { id: "child", parent_agenda_id: "middle" },
      { id: "middle", parent_agenda_id: "root" },
    ];
    expect(collectAgendaRegisterAncestors("child", malformed)).toEqual([]);
  });

  it("preserves first canonical parent identity when duplicate records are encountered", () => {
    const duplicates = [...items, { id: "b", parent_agenda_id: "a" }];
    expect(collectAgendaRegisterAncestors("b1", duplicates).map(x => x.id)).toEqual(["b", "p"]);
  });

  it("never mutates source records when reading ancestors", () => {
    const before=JSON.stringify(items);
    collectAgendaRegisterAncestors("b1", items);
    expect(JSON.stringify(items)).toBe(before);
  });

  it("shares canonical descendant traversal across archive, preview, and status calculations", () => {
    const src=readFileSync("src/app/pages/register-stock/Register4ListPage.tsx","utf8");
    expect(src).toContain("return collectAgendaRegisterDescendants(id, items);");
    expect(src).toContain("for (const parent of collectAgendaRegisterAncestors(changedId, allItems))");
    expect(src).not.toContain("children.flatMap(c => [c, ...getDescendants(c.id, items)])");
  });
});
