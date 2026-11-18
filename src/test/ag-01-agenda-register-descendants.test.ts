import { describe, expect, it } from "vitest";
import { collectAgendaRegisterDescendants } from "../app/pages/register-stock/agendaRegisterDescendants";

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
