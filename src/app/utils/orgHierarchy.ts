/**
 * Office Hierarchy Engine — Phase O1
 *
 * Pure utility functions for the organisational-unit hierarchy.
 * No side-effects, no React imports, no localStorage access.
 * Safe to import from any layer.
 */

import type { OrgUnit } from "../data/boardMeetingData";
import type { BmsUser } from "../data/bmsUsers";

// ── Unit-type constants ────────────────────────────────────────────────────────

/** Phase 1 unit types shown in visible UI. */
export const PHASE1_UNIT_TYPES = [
  "Organization",
  "Head Office",
  "Branch",
  "Division",
  "Department",
] as const;

/** Phase 2 unit types — prepared but hidden from UI until Phase 2. */
export const PHASE2_UNIT_TYPES = [
  "Regional Office",
  "Section",
  "Team",
] as const;

export type Phase1UnitType = typeof PHASE1_UNIT_TYPES[number];
export type Phase2UnitType = typeof PHASE2_UNIT_TYPES[number];

/**
 * Valid parent types for each unit type.
 * An empty array means the type is a root and must have no parent.
 * Undefined means no restriction (legacy / unknown types).
 */
export const VALID_PARENT_TYPES: Record<string, string[]> = {
  Organization:    [],
  "Head Office":   ["Organization"],
  Branch:          ["Organization", "Head Office"],
  Division:        ["Head Office", "Branch"],
  Department:      ["Division"],
  "Regional Office": ["Organization", "Head Office"],
  Section:         ["Department", "Division"],
  Team:            ["Section", "Department"],
};

/** Statuses that mean a unit is unavailable for assignment. */
export const INACTIVE_STATUSES = new Set([
  "Inactive", "inactive",
  "Deactivated", "deactivated",
  "Archived", "archived",
  "Scheduled for Closure",
]);

// ── Look-up helpers ────────────────────────────────────────────────────────────

/** Find a unit by its entity `id`. */
export function findUnit(
  id: string | null | undefined,
  units: OrgUnit[],
): OrgUnit | undefined {
  if (!id) return undefined;
  return units.find((u) => u.id === id);
}

/** Find the immediate parent of a unit. */
export function findParent(unit: OrgUnit, units: OrgUnit[]): OrgUnit | undefined {
  return unit.parent_unit_id ? findUnit(unit.parent_unit_id, units) : undefined;
}

/** Find all direct children of a unit (by entity `id`). */
export function findChildren(id: string, units: OrgUnit[]): OrgUnit[] {
  return units.filter((u) => u.parent_unit_id === id);
}

/**
 * Find all descendants of a unit (BFS).
 * The unit itself is NOT included in the result.
 */
export function findDescendants(id: string, units: OrgUnit[]): OrgUnit[] {
  const result: OrgUnit[] = [];
  const queue: string[] = [id];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const children = findChildren(current, units);
    for (const child of children) {
      result.push(child);
      queue.push(child.id);
    }
  }
  return result;
}

/**
 * Build the ancestor path from the root down to the unit with `id`.
 * The unit itself is included as the last element.
 */
export function buildHierarchyPath(id: string, units: OrgUnit[]): OrgUnit[] {
  const path: OrgUnit[] = [];
  let current = units.find((u) => u.id === id);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parent_unit_id
      ? units.find((u) => u.id === current!.parent_unit_id)
      : undefined;
  }
  return path;
}

/** Build a human-readable path label, e.g. "Meridian › Head Office › Finance". */
export function buildPathLabel(id: string, units: OrgUnit[]): string {
  return buildHierarchyPath(id, units)
    .map((u) => u.unit_name)
    .join(" › ");
}

/** Build the ordered array of ancestor IDs from root to the unit. */
export function buildPathIds(id: string, units: OrgUnit[]): string[] {
  return buildHierarchyPath(id, units).map((u) => u.id);
}

// ── Cycle detection ────────────────────────────────────────────────────────────

/**
 * Returns true when setting `newParentId` as the parent of `unitId`
 * would create a circular reference (i.e. newParentId is a descendant
 * of unitId, or unitId === newParentId).
 */
export function detectCycle(
  unitId: string,
  newParentId: string | null | undefined,
  units: OrgUnit[],
): boolean {
  if (!newParentId) return false;
  if (unitId === newParentId) return true;
  const descendants = findDescendants(unitId, units);
  return descendants.some((d) => d.id === newParentId);
}

// ── Parent-type validation ─────────────────────────────────────────────────────

/**
 * Returns true when a unit of `unitType` can have a parent of `parentType`.
 *
 * - Root types (Organization) require no parent → parentType must be absent.
 * - All other Phase 1 types require a parent of the correct type.
 * - Unknown / legacy types always pass.
 */
export function validateParentType(
  unitType: string,
  parentType: string | undefined,
): boolean {
  const validParents = VALID_PARENT_TYPES[unitType];
  if (validParents === undefined) return true; // unknown type — no restriction
  if (validParents.length === 0) return !parentType; // root type needs no parent
  if (!parentType) return false; // non-root needs a parent
  return validParents.includes(parentType);
}

/**
 * Returns the list of units that are valid parents for a new unit of `unitType`.
 * Excludes self, descendants of `unitId`, and inactive/archived units.
 */
export function getValidParents(
  unitId: string,
  unitType: string,
  units: OrgUnit[],
  allowedStatuses?: string[],
): OrgUnit[] {
  const validParentTypes = VALID_PARENT_TYPES[unitType];
  if (!validParentTypes || validParentTypes.length === 0) return []; // root type

  const allowed = allowedStatuses
    ? new Set(allowedStatuses)
    : undefined;

  const descendants = new Set(findDescendants(unitId, units).map((d) => d.id));

  return units.filter(
    (u) =>
      u.id !== unitId &&
      !descendants.has(u.id) &&
      validParentTypes.includes(u.unit_type) &&
      !INACTIVE_STATUSES.has(u.status) &&
      (!allowed || allowed.has(u.status)),
  );
}

// ── User resolution ────────────────────────────────────────────────────────────

/**
 * Returns users whose primary organisational assignment matches `unitId`.
 * A user matches when any of their org-unit IDs equals `unitId`.
 */
export function resolveUnitUsers(unitId: string, users: BmsUser[]): BmsUser[] {
  return users.filter(
    (u) =>
      u.primary_org_unit_id === unitId ||
      u.branch_id === unitId ||
      u.division_id === unitId ||
      u.department_id === unitId,
  );
}

/**
 * Returns users assigned to `unitId` or any of its descendants.
 */
export function resolveDescendantUsers(
  unitId: string,
  units: OrgUnit[],
  users: BmsUser[],
): BmsUser[] {
  const ids = new Set([unitId, ...findDescendants(unitId, units).map((u) => u.id)]);
  return users.filter(
    (u) =>
      (u.primary_org_unit_id && ids.has(u.primary_org_unit_id)) ||
      (u.branch_id && ids.has(u.branch_id)) ||
      (u.division_id && ids.has(u.division_id)) ||
      (u.department_id && ids.has(u.department_id)),
  );
}

// ── Count helpers ──────────────────────────────────────────────────────────────

/** Count direct children of `unitId`. */
export function recalculateChildCount(unitId: string, units: OrgUnit[]): number {
  return findChildren(unitId, units).length;
}

/** Count users whose primary assignment is this unit. */
export function recalculateMemberCount(unitId: string, users: BmsUser[]): number {
  return resolveUnitUsers(unitId, users).length;
}

// ── Assignment eligibility ─────────────────────────────────────────────────────

/** Returns true when the unit can receive new user or child-unit assignments. */
export function isUnitAssignable(unit: OrgUnit): boolean {
  return !INACTIVE_STATUSES.has(unit.status);
}

// ── Dependency checks ──────────────────────────────────────────────────────────

/**
 * Returns a list of human-readable dependency descriptions that prevent
 * deleting or deactivating `unitId`.  An empty array means no dependencies.
 */
export function checkDependencies(
  unitId: string,
  units: OrgUnit[],
  users: BmsUser[],
): string[] {
  const deps: string[] = [];
  const children = findChildren(unitId, units);
  if (children.length > 0) deps.push(`Has ${children.length} child unit(s)`);
  const members = resolveUnitUsers(unitId, users);
  if (members.length > 0) deps.push(`Has ${members.length} assigned user(s)`);
  return deps;
}

/**
 * Returns true when the unit has no children and no assigned users,
 * making permanent deletion safe.
 */
export function checkSafeDeletion(
  unitId: string,
  units: OrgUnit[],
  users: BmsUser[],
): boolean {
  return checkDependencies(unitId, units, users).length === 0;
}

// ── Cross-module integration ───────────────────────────────────────────────────

/**
 * Returns all active (non-inactive) users assigned to `unitId`.
 */
export function resolveEligibleUnitUsers(unitId: string, users: BmsUser[]): BmsUser[] {
  return resolveUnitUsers(unitId, users).filter(
    (u) => u.account_status === "active" || u.account_status === "pending_activation",
  );
}

/**
 * Returns a deduplicated, active user list across `unitId` and all descendants.
 * Useful for meeting-participant selection, quorum, notification targeting, etc.
 */
export function resolveAllEligibleUsers(
  unitId: string,
  units: OrgUnit[],
  users: BmsUser[],
): BmsUser[] {
  const seen = new Set<string>();
  const result: BmsUser[] = [];
  for (const u of resolveDescendantUsers(unitId, units, users)) {
    if (!seen.has(u.id) && (u.account_status === "active" || u.account_status === "pending_activation")) {
      seen.add(u.id);
      result.push(u);
    }
  }
  return result;
}

/**
 * Returns true when a user is already assigned to any unit in `unitIds`.
 * Used to prevent duplicate primary assignments.
 */
export function isUserAlreadyAssigned(userId: string, users: BmsUser[], unitIds: string[]): boolean {
  const user = users.find((u) => u.id === userId);
  if (!user) return false;
  const ids = new Set(unitIds);
  return (
    (!!user.primary_org_unit_id && ids.has(user.primary_org_unit_id)) ||
    (!!user.branch_id           && ids.has(user.branch_id)) ||
    (!!user.division_id         && ids.has(user.division_id)) ||
    (!!user.department_id       && ids.has(user.department_id))
  );
}

/**
 * Determine which unit-ID field to set when assigning a user to a unit based
 * on the unit's type.
 *
 * Returns a partial BmsUser patch.
 */
export function buildUnitAssignmentPatch(
  unit: OrgUnit,
): Partial<Pick<BmsUser, "primary_org_unit_id" | "branch_id" | "division_id" | "department_id">> {
  switch (unit.unit_type) {
    case "Branch":     return { branch_id: unit.id,     primary_org_unit_id: unit.id };
    case "Division":   return { division_id: unit.id,   primary_org_unit_id: unit.id };
    case "Department": return { department_id: unit.id, primary_org_unit_id: unit.id };
    default:           return { primary_org_unit_id: unit.id };
  }
}

/**
 * Clears all unit-ID fields for a user (used before reassigning to a new unit).
 */
export function buildUnitClearancePatch(): Partial<Pick<BmsUser, "primary_org_unit_id" | "branch_id" | "division_id" | "department_id">> {
  return {
    primary_org_unit_id: undefined,
    branch_id:           undefined,
    division_id:         undefined,
    department_id:       undefined,
  };
}

/**
 * Recalculates path_ids and path_label for a unit and all its descendants,
 * returning an array of [id, patch] pairs to apply.
 *
 * Used after a unit move to keep all descendant paths consistent.
 */
export function recalculateDescendantPaths(
  movedUnitId: string,
  units: OrgUnit[],
): Array<{ id: string; path_ids: string[]; path_label: string }> {
  const updates: Array<{ id: string; path_ids: string[]; path_label: string }> = [];
  const scope = [movedUnitId, ...findDescendants(movedUnitId, units).map((u) => u.id)];
  for (const id of scope) {
    updates.push({
      id,
      path_ids:   buildPathIds(id, units),
      path_label: buildPathLabel(id, units),
    });
  }
  return updates;
}

// ── Name→ID migration ─────────────────────────────────────────────────────────

/**
 * Migrates legacy name-based `parent_unit` strings to stable `parent_unit_id`
 * references in a single pass.
 *
 * Only updates units that are missing `parent_unit_id`.
 * Returns a new array — does not mutate the input.
 */
export function migrateParentNamesToIds(units: OrgUnit[]): OrgUnit[] {
  const nameToId = new Map<string, string>(units.map((u) => [u.unit_name, u.id]));

  return units.map((u) => {
    if (u.parent_unit_id) return u; // already migrated
    if (!u.parent_unit || u.parent_unit === "—") return u; // root
    const resolvedId = nameToId.get(u.parent_unit);
    if (resolvedId) return { ...u, parent_unit_id: resolvedId };
    return u;
  });
}
