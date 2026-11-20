import { describe, expect, it } from "vitest";
import type { OrgUnit } from "../app/data/boardMeetingData";
import { detectCycle, findDescendants } from "../app/utils/orgHierarchy";

function node(id: string, parent_unit_id?: string): OrgUnit {
  return {
    id, unit_id: id, unit_name: id, unit_type: "Division",
    parent_unit: parent_unit_id ?? "—", parent_unit_id,
    head: "", member_count: "0", status: "Active", created_at: "2026-11-20",
  };
}

describe("GV-02 cycle-safe descendant traversal", () => {
  it("preserves normal tree descendants and traversal order", () => {
    const units = [node("root"), node("child", "root"), node("grand", "child"), node("sibling", "root")];
    expect(findDescendants("root", units).map(x => x.id)).toEqual(["child", "sibling", "grand"]);
  });

  it("never returns the parent as its own descendant when legacy data is self-linked", () => {
    const units = [node("root", "root")];
    expect(findDescendants("root", units)).toEqual([]);
    expect(detectCycle("root", "root", units)).toBe(true);
  });

  it("handles a two-unit existing cycle without repeats or an infinite traversal", () => {
    const units = [node("a", "b"), node("b", "a")];
    expect(findDescendants("a", units).map(x => x.id)).toEqual(["b"]);
    expect(findDescendants("b", units).map(x => x.id)).toEqual(["a"]);
    expect(detectCycle("a", "b", units)).toBe(true);
  });

  it("handles a longer legacy cycle without duplicating descendants", () => {
    const units = [node("a", "c"), node("b", "a"), node("c", "b")];
    expect(findDescendants("a", units).map(x => x.id)).toEqual(["b", "c"]);
  });

  it("returns an empty collection if the selected unit is missing", () => {
    expect(findDescendants("missing", [node("root"), node("child", "root")])).toEqual([]);
  });
});
