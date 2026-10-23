/**
 * Office Hierarchy Engine — Phase O1 tests.
 *
 * Covers:
 *  - findUnit / findParent / findChildren / findDescendants
 *  - buildHierarchyPath / buildPathLabel / buildPathIds
 *  - detectCycle
 *  - validateParentType
 *  - getValidParents
 *  - resolveUnitUsers / resolveDescendantUsers
 *  - recalculateChildCount / recalculateMemberCount
 *  - checkDependencies / checkSafeDeletion
 *  - migrateParentNamesToIds
 *  - isUnitAssignable
 *  - PHASE1_UNIT_TYPES / PHASE2_UNIT_TYPES constants
 */

import { describe, it, expect } from "vitest";
import type { OrgUnit } from "../app/data/boardMeetingData";
import type { BmsUser } from "../app/data/bmsUsers";

import {
  PHASE1_UNIT_TYPES,
  PHASE2_UNIT_TYPES,
  findUnit,
  findParent,
  findChildren,
  findDescendants,
  buildHierarchyPath,
  buildPathLabel,
  buildPathIds,
  detectCycle,
  validateParentType,
  getValidParents,
  resolveUnitUsers,
  resolveDescendantUsers,
  recalculateChildCount,
  recalculateMemberCount,
  checkDependencies,
  checkSafeDeletion,
  isUnitAssignable,
  migrateParentNamesToIds,
} from "../app/utils/orgHierarchy";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUnit(overrides: Partial<OrgUnit> & { id: string }): OrgUnit {
  return {
    unit_id:      `OU-${overrides.id}`,
    unit_name:    `Unit ${overrides.id}`,
    unit_type:    "Division",
    parent_unit:  "—",
    head:         "Test Head",
    member_count: "0",
    status:       "Active",
    created_at:   new Date().toISOString(),
    ...overrides,
  };
}

function makeUser(overrides: Partial<BmsUser> & { id: string }): BmsUser {
  return {
    name:         "Test User",
    email:        `user-${overrides.id}@example.com`,
    employee_id:  `EMP-${overrides.id}`,
    created_at:   new Date().toISOString(),
    ...overrides,
  };
}

// Tree used in most tests:
//   org (root, Organization)
//     └─ hq (Head Office)
//          ├─ fin (Division)
//          │    ├─ risk (Department)
//          │    └─ comp (Department)
//          └─ ops (Division)
//   branch (Branch, parent: org)

const org    = makeUnit({ id: "org",    unit_name: "Root Org",      unit_type: "Organization", parent_unit: "—" });
const hq     = makeUnit({ id: "hq",     unit_name: "Head Office",   unit_type: "Head Office",  parent_unit: "Root Org",    parent_unit_id: "org" });
const fin    = makeUnit({ id: "fin",    unit_name: "Finance Div",   unit_type: "Division",     parent_unit: "Head Office", parent_unit_id: "hq" });
const risk   = makeUnit({ id: "risk",   unit_name: "Risk Dept",     unit_type: "Department",   parent_unit: "Finance Div", parent_unit_id: "fin" });
const comp   = makeUnit({ id: "comp",   unit_name: "Compliance",    unit_type: "Department",   parent_unit: "Finance Div", parent_unit_id: "fin" });
const ops    = makeUnit({ id: "ops",    unit_name: "Operations",    unit_type: "Division",     parent_unit: "Head Office", parent_unit_id: "hq" });
const branch = makeUnit({ id: "branch", unit_name: "Gulshan Branch",unit_type: "Branch",       parent_unit: "Root Org",    parent_unit_id: "org" });

const ALL_UNITS = [org, hq, fin, risk, comp, ops, branch];

// ── Constants ─────────────────────────────────────────────────────────────────

describe("PHASE1_UNIT_TYPES", () => {
  it("contains exactly the 5 Phase 1 types", () => {
    expect(PHASE1_UNIT_TYPES).toContain("Organization");
    expect(PHASE1_UNIT_TYPES).toContain("Head Office");
    expect(PHASE1_UNIT_TYPES).toContain("Branch");
    expect(PHASE1_UNIT_TYPES).toContain("Division");
    expect(PHASE1_UNIT_TYPES).toContain("Department");
    expect(PHASE1_UNIT_TYPES).toHaveLength(5);
  });
});

describe("PHASE2_UNIT_TYPES", () => {
  it("contains Regional Office, Section, Team", () => {
    expect(PHASE2_UNIT_TYPES).toContain("Regional Office");
    expect(PHASE2_UNIT_TYPES).toContain("Section");
    expect(PHASE2_UNIT_TYPES).toContain("Team");
    expect(PHASE2_UNIT_TYPES).toHaveLength(3);
  });
});

// ── findUnit ──────────────────────────────────────────────────────────────────

describe("findUnit", () => {
  it("returns the unit for a known ID", () => {
    expect(findUnit("fin", ALL_UNITS)).toEqual(fin);
  });

  it("returns undefined for an unknown ID", () => {
    expect(findUnit("xyz", ALL_UNITS)).toBeUndefined();
  });

  it("returns undefined for null/undefined ID", () => {
    expect(findUnit(null, ALL_UNITS)).toBeUndefined();
    expect(findUnit(undefined, ALL_UNITS)).toBeUndefined();
  });
});

// ── findParent ────────────────────────────────────────────────────────────────

describe("findParent", () => {
  it("returns the parent for a non-root unit", () => {
    expect(findParent(fin, ALL_UNITS)).toEqual(hq);
    expect(findParent(risk, ALL_UNITS)).toEqual(fin);
  });

  it("returns undefined for a root unit (no parent_unit_id)", () => {
    expect(findParent(org, ALL_UNITS)).toBeUndefined();
  });
});

// ── findChildren ─────────────────────────────────────────────────────────────

describe("findChildren", () => {
  it("returns direct children", () => {
    const children = findChildren("hq", ALL_UNITS);
    expect(children.map(c => c.id).sort()).toEqual(["fin", "ops"]);
  });

  it("returns empty array for a leaf node", () => {
    expect(findChildren("risk", ALL_UNITS)).toHaveLength(0);
  });

  it("returns empty array for a unit with no children", () => {
    expect(findChildren("branch", ALL_UNITS)).toHaveLength(0);
  });
});

// ── findDescendants ────────────────────────────────────────────────────────────

describe("findDescendants", () => {
  it("returns all descendants (not including self)", () => {
    const desc = findDescendants("hq", ALL_UNITS).map(u => u.id).sort();
    expect(desc).toEqual(["comp", "fin", "ops", "risk"]);
  });

  it("includes only direct subtree, not siblings", () => {
    const desc = findDescendants("fin", ALL_UNITS).map(u => u.id).sort();
    expect(desc).toEqual(["comp", "risk"]);
  });

  it("returns empty array for a leaf", () => {
    expect(findDescendants("risk", ALL_UNITS)).toHaveLength(0);
  });

  it("does not include self", () => {
    const desc = findDescendants("hq", ALL_UNITS);
    expect(desc.some(u => u.id === "hq")).toBe(false);
  });
});

// ── buildHierarchyPath ────────────────────────────────────────────────────────

describe("buildHierarchyPath", () => {
  it("builds the full path from root to target", () => {
    const path = buildHierarchyPath("risk", ALL_UNITS).map(u => u.id);
    expect(path).toEqual(["org", "hq", "fin", "risk"]);
  });

  it("returns a single-element array for the root", () => {
    const path = buildHierarchyPath("org", ALL_UNITS).map(u => u.id);
    expect(path).toEqual(["org"]);
  });
});

// ── buildPathLabel ────────────────────────────────────────────────────────────

describe("buildPathLabel", () => {
  it("joins unit names with › separator", () => {
    expect(buildPathLabel("risk", ALL_UNITS)).toBe(
      "Root Org › Head Office › Finance Div › Risk Dept",
    );
  });
});

// ── buildPathIds ──────────────────────────────────────────────────────────────

describe("buildPathIds", () => {
  it("returns ordered ancestor IDs", () => {
    expect(buildPathIds("comp", ALL_UNITS)).toEqual(["org", "hq", "fin", "comp"]);
  });
});

// ── detectCycle ───────────────────────────────────────────────────────────────

describe("detectCycle", () => {
  it("returns false when no cycle", () => {
    expect(detectCycle("fin", "org", ALL_UNITS)).toBe(false);
  });

  it("returns true for self-reference", () => {
    expect(detectCycle("fin", "fin", ALL_UNITS)).toBe(true);
  });

  it("returns true when setting parent to a descendant", () => {
    // Setting org's parent to risk (which is under org) creates a cycle
    expect(detectCycle("org", "risk", ALL_UNITS)).toBe(true);
    expect(detectCycle("hq", "comp", ALL_UNITS)).toBe(true);
  });

  it("returns false when new parent is null/undefined (root assignment)", () => {
    expect(detectCycle("fin", null, ALL_UNITS)).toBe(false);
    expect(detectCycle("fin", undefined, ALL_UNITS)).toBe(false);
  });

  it("returns false when moving to sibling subtree", () => {
    expect(detectCycle("fin", "ops", ALL_UNITS)).toBe(false);
  });
});

// ── validateParentType ────────────────────────────────────────────────────────

describe("validateParentType", () => {
  it("Organization requires no parent", () => {
    expect(validateParentType("Organization", undefined)).toBe(true);
    expect(validateParentType("Organization", "Head Office")).toBe(false);
  });

  it("Head Office requires Organization parent", () => {
    expect(validateParentType("Head Office", "Organization")).toBe(true);
    expect(validateParentType("Head Office", "Division")).toBe(false);
    expect(validateParentType("Head Office", undefined)).toBe(false);
  });

  it("Branch accepts Organization or Head Office", () => {
    expect(validateParentType("Branch", "Organization")).toBe(true);
    expect(validateParentType("Branch", "Head Office")).toBe(true);
    expect(validateParentType("Branch", "Division")).toBe(false);
  });

  it("Division accepts Head Office or Branch", () => {
    expect(validateParentType("Division", "Head Office")).toBe(true);
    expect(validateParentType("Division", "Branch")).toBe(true);
    expect(validateParentType("Division", "Department")).toBe(false);
  });

  it("Department requires Division parent", () => {
    expect(validateParentType("Department", "Division")).toBe(true);
    expect(validateParentType("Department", "Branch")).toBe(false);
    expect(validateParentType("Department", undefined)).toBe(false);
  });

  it("unknown type always returns true", () => {
    expect(validateParentType("LegacyType", "Anything")).toBe(true);
    expect(validateParentType("LegacyType", undefined)).toBe(true);
  });
});

// ── getValidParents ────────────────────────────────────────────────────────────

describe("getValidParents", () => {
  it("returns appropriate parents for Division", () => {
    // Valid parents for a new Division are Head Office and Branch units
    const parents = getValidParents("fin", "Division", ALL_UNITS);
    const ids = parents.map(p => p.id).sort();
    expect(ids).toContain("hq");
    expect(ids).toContain("branch");
    expect(ids).not.toContain("fin"); // self excluded
    expect(ids).not.toContain("risk"); // descendant excluded
    expect(ids).not.toContain("comp"); // descendant excluded
  });

  it("returns empty array for Organization (root type)", () => {
    expect(getValidParents("org", "Organization", ALL_UNITS)).toHaveLength(0);
  });

  it("excludes inactive/archived units", () => {
    const inactiveHq = { ...hq, id: "hq-inactive", status: "Inactive" };
    const units = [...ALL_UNITS, inactiveHq];
    const parents = getValidParents("fin", "Division", units);
    expect(parents.some(p => p.id === "hq-inactive")).toBe(false);
  });
});

// ── resolveUnitUsers ──────────────────────────────────────────────────────────

describe("resolveUnitUsers", () => {
  const u1 = makeUser({ id: "u1", primary_org_unit_id: "fin" });
  const u2 = makeUser({ id: "u2", division_id: "fin" });
  const u3 = makeUser({ id: "u3", department_id: "risk" });
  const u4 = makeUser({ id: "u4", branch_id: "branch" });
  const users = [u1, u2, u3, u4];

  it("returns users with primary_org_unit_id matching the unit", () => {
    expect(resolveUnitUsers("fin", users)).toContain(u1);
  });

  it("returns users with division_id matching the unit", () => {
    expect(resolveUnitUsers("fin", users)).toContain(u2);
  });

  it("does not return users assigned to other units", () => {
    const result = resolveUnitUsers("fin", users);
    expect(result).not.toContain(u3);
    expect(result).not.toContain(u4);
  });

  it("returns users with branch_id matching the unit", () => {
    expect(resolveUnitUsers("branch", users)).toContain(u4);
  });
});

// ── resolveDescendantUsers ────────────────────────────────────────────────────

describe("resolveDescendantUsers", () => {
  const u1 = makeUser({ id: "u1", primary_org_unit_id: "hq" });
  const u2 = makeUser({ id: "u2", division_id: "fin" });
  const u3 = makeUser({ id: "u3", department_id: "risk" });
  const u4 = makeUser({ id: "u4", branch_id: "branch" }); // different subtree
  const users = [u1, u2, u3, u4];

  it("includes users in the unit and all descendants", () => {
    const result = resolveDescendantUsers("hq", ALL_UNITS, users);
    expect(result).toContain(u1); // assigned to hq
    expect(result).toContain(u2); // assigned to fin (child of hq)
    expect(result).toContain(u3); // assigned to risk (grandchild)
    expect(result).not.toContain(u4); // branch is not under hq
  });
});

// ── recalculateChildCount ─────────────────────────────────────────────────────

describe("recalculateChildCount", () => {
  it("counts direct children only", () => {
    expect(recalculateChildCount("hq", ALL_UNITS)).toBe(2); // fin, ops
    expect(recalculateChildCount("fin", ALL_UNITS)).toBe(2); // risk, comp
    expect(recalculateChildCount("risk", ALL_UNITS)).toBe(0);
  });
});

// ── recalculateMemberCount ────────────────────────────────────────────────────

describe("recalculateMemberCount", () => {
  const users = [
    makeUser({ id: "u1", primary_org_unit_id: "fin" }),
    makeUser({ id: "u2", division_id: "fin" }),
    makeUser({ id: "u3", primary_org_unit_id: "ops" }),
  ];

  it("counts only direct unit members", () => {
    expect(recalculateMemberCount("fin", users)).toBe(2);
    expect(recalculateMemberCount("ops", users)).toBe(1);
    expect(recalculateMemberCount("risk", users)).toBe(0);
  });
});

// ── checkDependencies ─────────────────────────────────────────────────────────

describe("checkDependencies", () => {
  const users = [makeUser({ id: "u1", primary_org_unit_id: "fin" })];

  it("reports child units as a dependency", () => {
    const deps = checkDependencies("hq", ALL_UNITS, []);
    expect(deps.length).toBeGreaterThan(0);
    expect(deps.some(d => d.includes("child"))).toBe(true);
  });

  it("reports assigned users as a dependency", () => {
    const deps = checkDependencies("fin", ALL_UNITS, users);
    expect(deps.some(d => d.includes("user"))).toBe(true);
  });

  it("returns empty array for a leaf with no users", () => {
    expect(checkDependencies("risk", ALL_UNITS, [])).toHaveLength(0);
  });
});

// ── checkSafeDeletion ─────────────────────────────────────────────────────────

describe("checkSafeDeletion", () => {
  it("returns true for a leaf with no users", () => {
    expect(checkSafeDeletion("risk", ALL_UNITS, [])).toBe(true);
  });

  it("returns false when the unit has children", () => {
    expect(checkSafeDeletion("hq", ALL_UNITS, [])).toBe(false);
  });

  it("returns false when the unit has assigned users", () => {
    const users = [makeUser({ id: "u1", department_id: "risk" })];
    expect(checkSafeDeletion("risk", ALL_UNITS, users)).toBe(false);
  });
});

// ── isUnitAssignable ──────────────────────────────────────────────────────────

describe("isUnitAssignable", () => {
  it("returns true for Active units", () => {
    expect(isUnitAssignable(makeUnit({ id: "x", status: "Active" }))).toBe(true);
  });

  it("returns false for Inactive, Deactivated, Archived", () => {
    expect(isUnitAssignable(makeUnit({ id: "x", status: "Inactive" }))).toBe(false);
    expect(isUnitAssignable(makeUnit({ id: "x", status: "Deactivated" }))).toBe(false);
    expect(isUnitAssignable(makeUnit({ id: "x", status: "Archived" }))).toBe(false);
    expect(isUnitAssignable(makeUnit({ id: "x", status: "inactive" }))).toBe(false);
  });

  it("returns true for Draft and Scheduled for Closure status", () => {
    expect(isUnitAssignable(makeUnit({ id: "x", status: "Draft" }))).toBe(true);
  });
});

// ── migrateParentNamesToIds ───────────────────────────────────────────────────

describe("migrateParentNamesToIds", () => {
  it("resolves parent_unit strings to parent_unit_id using the name→ID map", () => {
    const root = makeUnit({ id: "r1", unit_name: "Root", unit_type: "Organization", parent_unit: "—" });
    const child = makeUnit({ id: "c1", unit_name: "Child", unit_type: "Division", parent_unit: "Root" });
    const result = migrateParentNamesToIds([root, child]);
    expect(result.find(u => u.id === "c1")?.parent_unit_id).toBe("r1");
  });

  it("does not overwrite an existing parent_unit_id", () => {
    const root  = makeUnit({ id: "r1", unit_name: "Root", unit_type: "Organization", parent_unit: "—" });
    const child = makeUnit({ id: "c1", unit_name: "Child", unit_type: "Division", parent_unit: "Root", parent_unit_id: "already-set" });
    const result = migrateParentNamesToIds([root, child]);
    expect(result.find(u => u.id === "c1")?.parent_unit_id).toBe("already-set");
  });

  it("leaves root units (parent_unit === '—') without parent_unit_id", () => {
    const root = makeUnit({ id: "r1", unit_name: "Root", unit_type: "Organization", parent_unit: "—" });
    const result = migrateParentNamesToIds([root]);
    expect(result[0].parent_unit_id).toBeUndefined();
  });

  it("leaves units unmodified when name is not found", () => {
    const orphan = makeUnit({ id: "o1", unit_type: "Division", parent_unit: "NonExistent" });
    const result = migrateParentNamesToIds([orphan]);
    expect(result[0].parent_unit_id).toBeUndefined();
  });

  it("does not mutate the original array", () => {
    const root  = makeUnit({ id: "r1", unit_name: "Root", unit_type: "Organization", parent_unit: "—" });
    const child = makeUnit({ id: "c1", unit_type: "Division", parent_unit: "Root" });
    const original = [root, child];
    migrateParentNamesToIds(original);
    expect(original[1].parent_unit_id).toBeUndefined();
  });
});
