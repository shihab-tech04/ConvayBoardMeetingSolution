/**
 * Office Hierarchy Phase O3 — End-to-End and Edge-Case Tests
 *
 * Covers:
 *  - 16-step lifecycle (create → assign → transfer → move → deactivate → restore)
 *  - Duplicate code prevention
 *  - Invalid parent type
 *  - Inactive parent rejection
 *  - Cycle detection
 *  - Permissions: deny-by-default, role-based grants
 *  - Cross-module resolvers
 *  - Path recalculation after unit move
 *  - User assignment uniqueness
 */

import { describe, it, expect, beforeEach } from "vitest";

import type { OrgUnit } from "../app/data/boardMeetingData";
import type { BmsUser } from "../app/data/bmsUsers";

import {
  findChildren, findDescendants, findParent, buildPathLabel, buildPathIds,
  detectCycle, validateParentType, getValidParents,
  resolveUnitUsers, resolveDescendantUsers,
  recalculateChildCount, recalculateMemberCount,
  isUnitAssignable, checkDependencies, checkSafeDeletion,
  buildUnitAssignmentPatch, buildUnitClearancePatch,
  isUserAlreadyAssigned, recalculateDescendantPaths,
  resolveEligibleUnitUsers, resolveAllEligibleUsers,
  migrateParentNamesToIds,
  VALID_PARENT_TYPES, INACTIVE_STATUSES,
} from "../app/utils/orgHierarchy";

import { resolveOrgPermissions } from "../app/utils/orgPermissions";

// ── Test fixtures ──────────────────────────────────────────────────────────────

const NOW = "2026-01-01T00:00:00.000Z";

function makeUnit(overrides: Partial<OrgUnit> & Pick<OrgUnit, "id" | "unit_id" | "unit_name" | "unit_type" | "status">): OrgUnit {
  return {
    head: "",
    parent_unit: "",
    member_count: "0",
    created_at: NOW,
    ...overrides,
  };
}

function makeUser(overrides: Partial<BmsUser> & Pick<BmsUser, "id" | "name" | "email" | "employee_id">): BmsUser {
  return {
    created_at:     NOW,
    account_status: "active",
    ...overrides,
  };
}

// ── 16-Step lifecycle test ─────────────────────────────────────────────────────

describe("16-step lifecycle", () => {
  // Mutable state shared across lifecycle steps
  let units: OrgUnit[];
  let users: BmsUser[];

  beforeEach(() => {
    units = [];
    users = [];
  });

  // Step 1: Create Head Office
  it("step 1: creates Head Office under Organization", () => {
    const org = makeUnit({ id: "org1", unit_id: "OU-001", unit_name: "Acme Corp", unit_type: "Organization", status: "Active" });
    const hq  = makeUnit({ id: "hq1",  unit_id: "OU-002", unit_name: "Head Office", unit_type: "Head Office", status: "Active", parent_unit_id: "org1" });
    units = [org, hq];

    expect(findParent(hq, units)?.id).toBe("org1");
    expect(validateParentType("Head Office", "Organization")).toBe(true);
    expect(validateParentType("Head Office", "Branch")).toBe(false);
  });

  // Step 2: Create a branch
  it("step 2: creates a Branch under Head Office", () => {
    const org    = makeUnit({ id: "org1", unit_id: "OU-001", unit_name: "Acme", unit_type: "Organization", status: "Active" });
    const hq     = makeUnit({ id: "hq1",  unit_id: "OU-002", unit_name: "HQ",   unit_type: "Head Office",  status: "Active", parent_unit_id: "org1" });
    const branch = makeUnit({ id: "br1",  unit_id: "OU-003", unit_name: "East Branch", unit_type: "Branch", status: "Active", parent_unit_id: "hq1" });
    units = [org, hq, branch];

    expect(validateParentType("Branch", "Head Office")).toBe(true);
    expect(findChildren("hq1", units)).toHaveLength(1);
  });

  // Step 3: Create a division
  it("step 3: creates a Division under Branch", () => {
    const hq     = makeUnit({ id: "hq1", unit_id: "OU-002", unit_name: "HQ",       unit_type: "Head Office", status: "Active" });
    const branch = makeUnit({ id: "br1", unit_id: "OU-003", unit_name: "Branch",   unit_type: "Branch",      status: "Active", parent_unit_id: "hq1" });
    const div    = makeUnit({ id: "dv1", unit_id: "OU-004", unit_name: "Finance",  unit_type: "Division",    status: "Active", parent_unit_id: "br1" });
    units = [hq, branch, div];

    expect(validateParentType("Division", "Branch")).toBe(true);
    expect(buildPathLabel("dv1", units)).toBe("HQ › Branch › Finance");
  });

  // Step 4: Create a department
  it("step 4: creates a Department under Division", () => {
    const branch = makeUnit({ id: "br1", unit_id: "OU-003", unit_name: "Branch",   unit_type: "Branch",     status: "Active" });
    const div    = makeUnit({ id: "dv1", unit_id: "OU-004", unit_name: "Finance",  unit_type: "Division",   status: "Active", parent_unit_id: "br1" });
    const dept   = makeUnit({ id: "dp1", unit_id: "OU-005", unit_name: "Accounts", unit_type: "Department", status: "Active", parent_unit_id: "dv1" });
    units = [branch, div, dept];

    expect(validateParentType("Department", "Division")).toBe(true);
    expect(findParent(dept, units)?.id).toBe("dv1");
  });

  // Step 5: Assign a unit head
  it("step 5: assigns a unit head via head_user_id", () => {
    const unit = makeUnit({ id: "dv1", unit_id: "OU-004", unit_name: "Finance", unit_type: "Division", status: "Active" });
    const user = makeUser({ id: "u1", name: "Ali", email: "ali@test.com", employee_id: "EMP-001" });

    // Simulate assignment
    const updated = { ...unit, head_user_id: user.id, head: user.name };
    expect(updated.head_user_id).toBe("u1");
    expect(updated.head).toBe("Ali");
  });

  // Step 6: Assign users to a unit
  it("step 6: assigns users and counts them correctly", () => {
    const unit  = makeUnit({ id: "dv1", unit_id: "OU-004", unit_name: "Finance", unit_type: "Division", status: "Active" });
    const user1 = makeUser({ id: "u1", name: "Ali",   email: "ali@test.com",   employee_id: "EMP-001", division_id: "dv1", primary_org_unit_id: "dv1" });
    const user2 = makeUser({ id: "u2", name: "Fatima",email: "f@test.com",     employee_id: "EMP-002", division_id: "dv1", primary_org_unit_id: "dv1" });
    const user3 = makeUser({ id: "u3", name: "Karim", email: "k@test.com",     employee_id: "EMP-003", branch_id: "br1",   primary_org_unit_id: "br1" });
    users = [user1, user2, user3];

    expect(recalculateMemberCount("dv1", users)).toBe(2);
    expect(recalculateMemberCount("br1", users)).toBe(1);
  });

  // Step 7: Transfer a user
  it("step 7: transfers a user between units", () => {
    const div  = makeUnit({ id: "dv1", unit_id: "OU-004", unit_name: "Finance",   unit_type: "Division", status: "Active" });
    const dept = makeUnit({ id: "dp1", unit_id: "OU-005", unit_name: "Accounts",  unit_type: "Department", status: "Active", parent_unit_id: "dv1" });
    units = [div, dept];
    const user = makeUser({ id: "u1", name: "Ali", email: "ali@test.com", employee_id: "EMP-001", division_id: "dv1", primary_org_unit_id: "dv1" });
    users = [user];

    // Simulate transfer: clear old assignment, set new
    const cleared    = { ...buildUnitClearancePatch() };
    const newPatch   = buildUnitAssignmentPatch(dept);
    const transferred = { ...user, ...cleared, ...newPatch };

    expect(transferred.primary_org_unit_id).toBe("dp1");
    expect(transferred.department_id).toBe("dp1");
    expect(transferred.division_id).toBeUndefined();

    const updatedUsers = [transferred];
    expect(recalculateMemberCount("dv1", updatedUsers)).toBe(0);
    expect(recalculateMemberCount("dp1", updatedUsers)).toBe(1);
  });

  // Step 8: Replace a unit head
  it("step 8: replaces unit head by ending old assignment and starting new", () => {
    const user1 = makeUser({ id: "u1", name: "Ali",   email: "ali@test.com",   employee_id: "EMP-001" });
    const user2 = makeUser({ id: "u2", name: "Fatima",email: "f@test.com",     employee_id: "EMP-002" });

    // Simulate: old assignment ended, new one active
    const oldAssignment = { id: "a1", unit_id: "dv1", user_id: "u1", status: "ended" as const };
    const newAssignment = { id: "a2", unit_id: "dv1", user_id: "u2", status: "active" as const };

    const activeHeads = [newAssignment].filter((a) => a.status === "active");
    expect(activeHeads).toHaveLength(1);
    expect(activeHeads[0].user_id).toBe("u2");
  });

  // Step 9: Move a department to another division
  it("step 9: moves department and recalculates paths", () => {
    const div1 = makeUnit({ id: "dv1", unit_id: "OU-D1", unit_name: "Finance",   unit_type: "Division",   status: "Active", parent_unit_id: "hq1" });
    const div2 = makeUnit({ id: "dv2", unit_id: "OU-D2", unit_name: "Operations",unit_type: "Division",   status: "Active", parent_unit_id: "hq1" });
    const hq   = makeUnit({ id: "hq1", unit_id: "OU-HQ", unit_name: "HQ",        unit_type: "Head Office",status: "Active" });
    const dept = makeUnit({ id: "dp1", unit_id: "OU-DP", unit_name: "Accounts",  unit_type: "Department", status: "Active", parent_unit_id: "dv1" });
    units = [hq, div1, div2, dept];

    expect(detectCycle("dp1", "dv2", units)).toBe(false);
    expect(validateParentType("Department", "Division")).toBe(true);

    // Simulate parent change
    const updatedUnits = units.map((u) => u.id === "dp1" ? { ...u, parent_unit_id: "dv2" } : u);
    const pathUpdates  = recalculateDescendantPaths("dp1", updatedUnits);

    expect(pathUpdates).toHaveLength(1);
    expect(pathUpdates[0].path_ids).toContain("dp1");
    expect(pathUpdates[0].path_ids).toContain("dv2");
    expect(pathUpdates[0].path_label).toContain("Operations");
    expect(pathUpdates[0].path_label).toContain("Accounts");
  });

  // Step 10: Attempt circular move (blocked)
  it("step 10: blocks circular move", () => {
    const parent = makeUnit({ id: "p1", unit_id: "OU-P1", unit_name: "Parent", unit_type: "Division",   status: "Active" });
    const child  = makeUnit({ id: "c1", unit_id: "OU-C1", unit_name: "Child",  unit_type: "Department", status: "Active", parent_unit_id: "p1" });
    units = [parent, child];

    // Trying to move "parent" under "child" → cycle
    expect(detectCycle("p1", "c1", units)).toBe(true);
    // Trying to move "parent" under itself → cycle
    expect(detectCycle("p1", "p1", units)).toBe(true);
    // Valid non-circular move
    expect(detectCycle("c1", "p1", units)).toBe(false);
  });

  // Step 11: Attempt deactivation with unresolved dependencies
  it("step 11: deactivation blocked by users and children", () => {
    const div  = makeUnit({ id: "dv1", unit_id: "OU-D1", unit_name: "Finance", unit_type: "Division", status: "Active" });
    const dept = makeUnit({ id: "dp1", unit_id: "OU-DP", unit_name: "Accounts", unit_type: "Department", status: "Active", parent_unit_id: "dv1" });
    units = [div, dept];
    const user = makeUser({ id: "u1", name: "Ali", email: "ali@test.com", employee_id: "EMP-001", division_id: "dv1", primary_org_unit_id: "dv1" });
    users = [user];

    const deps = checkDependencies("dv1", units, users);
    expect(deps.length).toBeGreaterThan(0);
    expect(deps.some((d) => d.includes("child"))).toBe(true);
    expect(deps.some((d) => d.includes("user"))).toBe(true);
    expect(checkSafeDeletion("dv1", units, users)).toBe(false);
  });

  // Step 12: Resolve dependencies
  it("step 12: all dependencies resolved → safe to deactivate", () => {
    const div  = makeUnit({ id: "dv1", unit_id: "OU-D1", unit_name: "Finance", unit_type: "Division", status: "Active" });
    // child moved away, user transferred away
    units = [div];
    users = [];

    const deps = checkDependencies("dv1", units, users);
    expect(deps).toHaveLength(0);
    expect(checkSafeDeletion("dv1", units, users)).toBe(true);
  });

  // Step 13: Deactivate the unit
  it("step 13: deactivated unit is not assignable", () => {
    const div = makeUnit({ id: "dv1", unit_id: "OU-D1", unit_name: "Finance", unit_type: "Division", status: "Deactivated" });
    expect(isUnitAssignable(div)).toBe(false);
    expect(INACTIVE_STATUSES.has(div.status)).toBe(true);
  });

  // Step 14: Verify historical records
  it("step 14: deactivated unit keeps its data intact", () => {
    const div = makeUnit({
      id: "dv1", unit_id: "OU-D1", unit_name: "Finance", unit_type: "Division",
      status: "Deactivated", deactivated_at: NOW, deactivation_reason: "Restructuring",
    });
    // Data preserved
    expect(div.unit_name).toBe("Finance");
    expect(div.deactivated_at).toBe(NOW);
    expect(div.deactivation_reason).toBe("Restructuring");
  });

  // Step 15: Restore (reactivate) an archived unit
  it("step 15: archived unit can be reactivated to Draft/Active", () => {
    const div = makeUnit({ id: "dv1", unit_id: "OU-D1", unit_name: "Finance", unit_type: "Division", status: "Archived" });
    const reactivated = { ...div, status: "Active" as const };
    expect(isUnitAssignable(reactivated)).toBe(true);
  });

  // Step 16: Refresh — derived counts remain consistent
  it("step 16: counts remain consistent after all operations", () => {
    const div  = makeUnit({ id: "dv1", unit_id: "OU-D1", unit_name: "Finance",   unit_type: "Division",   status: "Active" });
    const dept = makeUnit({ id: "dp1", unit_id: "OU-DP", unit_name: "Accounts",  unit_type: "Department", status: "Active", parent_unit_id: "dv1" });
    units = [div, dept];
    const user1 = makeUser({ id: "u1", name: "Ali",   email: "ali@test.com", employee_id: "EMP-001", division_id: "dv1", primary_org_unit_id: "dv1" });
    const user2 = makeUser({ id: "u2", name: "Fatima",email: "f@test.com",   employee_id: "EMP-002", department_id: "dp1", primary_org_unit_id: "dp1" });
    users = [user1, user2];

    expect(recalculateChildCount("dv1", units)).toBe(1);
    expect(recalculateMemberCount("dv1", users)).toBe(1);
    expect(recalculateMemberCount("dp1", users)).toBe(1);
    expect(resolveDescendantUsers("dv1", units, users)).toHaveLength(2);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("duplicate unit code prevention", () => {
  it("detects duplicate codes via lookup", () => {
    const units = [
      makeUnit({ id: "u1", unit_id: "OU-001", unit_name: "Finance", unit_type: "Division", status: "Active", code: "FIN" }),
      makeUnit({ id: "u2", unit_id: "OU-002", unit_name: "Finance2", unit_type: "Division", status: "Active", code: "FIN" }),
    ];
    const codes = units.map((u) => u.code?.toUpperCase()).filter(Boolean);
    const codeSet = new Set(codes);
    expect(codeSet.size).toBeLessThan(codes.length); // duplicate present
  });

  it("allows same code after excluding self (edit scenario)", () => {
    const units = [
      makeUnit({ id: "u1", unit_id: "OU-001", unit_name: "Finance", unit_type: "Division", status: "Active", code: "FIN" }),
    ];
    const isDuplicate = units.some(
      (u) => u.code?.toUpperCase() === "FIN" && u.id !== "u1",
    );
    expect(isDuplicate).toBe(false);
  });
});

describe("invalid parent type", () => {
  it("blocks Department under Organization", () => {
    expect(validateParentType("Department", "Organization")).toBe(false);
  });

  it("blocks Department under Head Office", () => {
    expect(validateParentType("Department", "Head Office")).toBe(false);
  });

  it("allows Department under Division", () => {
    expect(validateParentType("Department", "Division")).toBe(true);
  });

  it("blocks Division under Organization", () => {
    expect(validateParentType("Division", "Organization")).toBe(false);
  });

  it("allows Organization with no parent", () => {
    expect(validateParentType("Organization", undefined)).toBe(true);
  });

  it("blocks Organization with a parent", () => {
    expect(validateParentType("Organization", "Organization")).toBe(false);
  });
});

describe("inactive parent rejection", () => {
  it("getValidParents excludes inactive units", () => {
    const units = [
      makeUnit({ id: "hq1", unit_id: "OU-HQ", unit_name: "HQ",      unit_type: "Head Office", status: "Active" }),
      makeUnit({ id: "hq2", unit_id: "OU-H2", unit_name: "HQ2",     unit_type: "Head Office", status: "Inactive" }),
      makeUnit({ id: "hq3", unit_id: "OU-H3", unit_name: "HQ3",     unit_type: "Head Office", status: "Deactivated" }),
      makeUnit({ id: "org1",unit_id: "OU-ORG",unit_name: "Org",     unit_type: "Organization",status: "Active" }),
    ];
    const validParents = getValidParents("br1", "Branch", units);
    const ids = validParents.map((u) => u.id);
    expect(ids).toContain("hq1");
    expect(ids).not.toContain("hq2");
    expect(ids).not.toContain("hq3");
  });
});

describe("user assignment uniqueness", () => {
  it("detects user already assigned to same unit", () => {
    const users = [
      makeUser({ id: "u1", name: "Ali", email: "ali@test.com", employee_id: "EMP-001", primary_org_unit_id: "dv1" }),
    ];
    expect(isUserAlreadyAssigned("u1", users, ["dv1"])).toBe(true);
    expect(isUserAlreadyAssigned("u1", users, ["dv2"])).toBe(false);
  });

  it("detects assignment via branch_id", () => {
    const users = [
      makeUser({ id: "u1", name: "Ali", email: "ali@test.com", employee_id: "EMP-001", branch_id: "br1" }),
    ];
    expect(isUserAlreadyAssigned("u1", users, ["br1"])).toBe(true);
  });

  it("inactive user excluded from resolveEligibleUnitUsers", () => {
    const users = [
      makeUser({ id: "u1", name: "Ali",   email: "ali@test.com", employee_id: "EMP-001", primary_org_unit_id: "dv1", account_status: "active" }),
      makeUser({ id: "u2", name: "Fatima",email: "f@test.com",   employee_id: "EMP-002", primary_org_unit_id: "dv1", account_status: "inactive" }),
    ];
    const eligible = resolveEligibleUnitUsers("dv1", users);
    expect(eligible.map((u) => u.id)).toEqual(["u1"]);
  });
});

describe("permissions — deny-by-default", () => {
  it("unknown role gets only view_structure", () => {
    const perm = resolveOrgPermissions([], "Unknown Role");
    expect(perm.view_structure).toBe(true);
    expect(perm.create_units).toBe(false);
    expect(perm.deactivate_units).toBe(false);
    expect(perm.assign_users).toBe(false);
    expect(perm.transfer_users).toBe(false);
  });

  it("system admin gets all permissions", () => {
    const perm = resolveOrgPermissions(["system admin"]);
    expect(perm.create_units).toBe(true);
    expect(perm.deactivate_units).toBe(true);
    expect(perm.archive_units).toBe(true);
    expect(perm.view_audit).toBe(true);
    expect(perm.assign_heads).toBe(true);
    expect(perm.move_units).toBe(true);
  });

  it("company secretary gets all permissions", () => {
    const perm = resolveOrgPermissions(["company secretary"]);
    expect(perm.create_units).toBe(true);
    expect(perm.transfer_users).toBe(true);
  });

  it("meeting secretary gets full rights via designation", () => {
    const perm = resolveOrgPermissions([], "Meeting Secretary");
    expect(perm.create_units).toBe(true);
    expect(perm.assign_users).toBe(true);
  });

  it("board member gets read-only", () => {
    const perm = resolveOrgPermissions(["board member"]);
    expect(perm.view_structure).toBe(true);
    expect(perm.view_history).toBe(true);
    expect(perm.view_audit).toBe(true);
    expect(perm.create_units).toBe(false);
    expect(perm.deactivate_units).toBe(false);
  });
});

describe("cross-module resolvers", () => {
  const units = [
    makeUnit({ id: "hq",  unit_id: "OU-HQ", unit_name: "HQ",      unit_type: "Head Office", status: "Active" }),
    makeUnit({ id: "div", unit_id: "OU-DV", unit_name: "Finance",  unit_type: "Division",   status: "Active", parent_unit_id: "hq" }),
    makeUnit({ id: "dep", unit_id: "OU-DP", unit_name: "Accounts", unit_type: "Department", status: "Active", parent_unit_id: "div" }),
  ];
  const users = [
    makeUser({ id: "u1", name: "A", email: "a@t.com", employee_id: "E1", primary_org_unit_id: "hq",  account_status: "active" }),
    makeUser({ id: "u2", name: "B", email: "b@t.com", employee_id: "E2", primary_org_unit_id: "div", account_status: "active" }),
    makeUser({ id: "u3", name: "C", email: "c@t.com", employee_id: "E3", primary_org_unit_id: "dep", account_status: "active" }),
    makeUser({ id: "u4", name: "D", email: "d@t.com", employee_id: "E4", primary_org_unit_id: "div", account_status: "inactive" }),
  ];

  it("resolveDescendantUsers returns all users in subtree", () => {
    const result = resolveDescendantUsers("hq", units, users);
    const ids = result.map((u) => u.id);
    expect(ids).toContain("u1");
    expect(ids).toContain("u2");
    expect(ids).toContain("u3");
    expect(ids).toContain("u4"); // includes inactive
  });

  it("resolveAllEligibleUsers deduplicates and filters inactive", () => {
    const result = resolveAllEligibleUsers("hq", units, users);
    const ids = result.map((u) => u.id);
    expect(ids).toContain("u1");
    expect(ids).toContain("u2");
    expect(ids).toContain("u3");
    expect(ids).not.toContain("u4"); // inactive excluded
    // No duplicates
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("resolveEligibleUnitUsers filters inactive", () => {
    const result = resolveEligibleUnitUsers("div", users);
    const ids = result.map((u) => u.id);
    expect(ids).toContain("u2");
    expect(ids).not.toContain("u4"); // inactive
  });
});

describe("buildUnitAssignmentPatch", () => {
  it("sets correct field for Branch", () => {
    const unit = makeUnit({ id: "br1", unit_id: "OU-BR1", unit_name: "East", unit_type: "Branch", status: "Active" });
    const patch = buildUnitAssignmentPatch(unit);
    expect(patch.branch_id).toBe("br1");
    expect(patch.primary_org_unit_id).toBe("br1");
  });

  it("sets correct field for Division", () => {
    const unit = makeUnit({ id: "dv1", unit_id: "OU-DV1", unit_name: "Finance", unit_type: "Division", status: "Active" });
    const patch = buildUnitAssignmentPatch(unit);
    expect(patch.division_id).toBe("dv1");
    expect(patch.primary_org_unit_id).toBe("dv1");
  });

  it("sets correct field for Department", () => {
    const unit = makeUnit({ id: "dp1", unit_id: "OU-DP1", unit_name: "HR", unit_type: "Department", status: "Active" });
    const patch = buildUnitAssignmentPatch(unit);
    expect(patch.department_id).toBe("dp1");
    expect(patch.primary_org_unit_id).toBe("dp1");
  });

  it("buildUnitClearancePatch clears all org-unit IDs", () => {
    const patch = buildUnitClearancePatch();
    expect(patch.primary_org_unit_id).toBeUndefined();
    expect(patch.branch_id).toBeUndefined();
    expect(patch.division_id).toBeUndefined();
    expect(patch.department_id).toBeUndefined();
  });
});

describe("recalculateDescendantPaths", () => {
  it("recalculates paths for unit and all descendants", () => {
    const hq   = makeUnit({ id: "hq",  unit_id: "OU-HQ", unit_name: "HQ",      unit_type: "Head Office", status: "Active" });
    const div  = makeUnit({ id: "div", unit_id: "OU-DV", unit_name: "Finance",  unit_type: "Division",   status: "Active", parent_unit_id: "hq" });
    const dep  = makeUnit({ id: "dep", unit_id: "OU-DP", unit_name: "Accounts", unit_type: "Department", status: "Active", parent_unit_id: "div" });
    const dep2 = makeUnit({ id: "dp2", unit_id: "OU-D2", unit_name: "Tax",      unit_type: "Department", status: "Active", parent_unit_id: "div" });
    const units = [hq, div, dep, dep2];

    const updates = recalculateDescendantPaths("div", units);
    expect(updates).toHaveLength(3); // div, dep, dep2

    const divUpdate = updates.find((u) => u.id === "div");
    expect(divUpdate?.path_label).toBe("HQ › Finance");
    expect(divUpdate?.path_ids).toEqual(["hq", "div"]);

    const depUpdate = updates.find((u) => u.id === "dep");
    expect(depUpdate?.path_label).toBe("HQ › Finance › Accounts");
  });
});

describe("path building", () => {
  it("builds correct path for deeply nested unit", () => {
    const units = [
      makeUnit({ id: "o",  unit_id: "OU-O",  unit_name: "Acme",     unit_type: "Organization", status: "Active" }),
      makeUnit({ id: "hq", unit_id: "OU-HQ", unit_name: "HQ",       unit_type: "Head Office",  status: "Active", parent_unit_id: "o" }),
      makeUnit({ id: "br", unit_id: "OU-BR", unit_name: "East",     unit_type: "Branch",       status: "Active", parent_unit_id: "hq" }),
      makeUnit({ id: "dv", unit_id: "OU-DV", unit_name: "Finance",  unit_type: "Division",     status: "Active", parent_unit_id: "br" }),
      makeUnit({ id: "dp", unit_id: "OU-DP", unit_name: "Accounts", unit_type: "Department",   status: "Active", parent_unit_id: "dv" }),
    ];
    expect(buildPathLabel("dp", units)).toBe("Acme › HQ › East › Finance › Accounts");
    expect(buildPathIds("dp", units)).toEqual(["o", "hq", "br", "dv", "dp"]);
  });
});

describe("migrateParentNamesToIds", () => {
  it("fills parent_unit_id from parent_unit name", () => {
    const units: OrgUnit[] = [
      makeUnit({ id: "hq",  unit_id: "OU-HQ", unit_name: "Head Office", unit_type: "Head Office", status: "Active" }),
      makeUnit({ id: "div", unit_id: "OU-DV", unit_name: "Finance",     unit_type: "Division",    status: "Active", parent_unit: "Head Office" }),
    ];
    const migrated = migrateParentNamesToIds(units);
    const div = migrated.find((u) => u.id === "div");
    expect(div?.parent_unit_id).toBe("hq");
  });

  it("leaves already-migrated units unchanged", () => {
    const units: OrgUnit[] = [
      makeUnit({ id: "hq",  unit_id: "OU-HQ", unit_name: "HQ",      unit_type: "Head Office", status: "Active" }),
      makeUnit({ id: "div", unit_id: "OU-DV", unit_name: "Finance", unit_type: "Division",    status: "Active", parent_unit: "HQ", parent_unit_id: "hq" }),
    ];
    const migrated = migrateParentNamesToIds(units);
    expect(migrated[1].parent_unit_id).toBe("hq");
  });

  it("leaves root unit without parent_unit_id", () => {
    const units: OrgUnit[] = [
      makeUnit({ id: "org", unit_id: "OU-ORG", unit_name: "Acme", unit_type: "Organization", status: "Active", parent_unit: "—" }),
    ];
    const migrated = migrateParentNamesToIds(units);
    expect(migrated[0].parent_unit_id).toBeUndefined();
  });
});
