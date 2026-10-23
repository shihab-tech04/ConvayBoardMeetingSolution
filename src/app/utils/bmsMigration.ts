/**
 * One-time migration utility: nbr.* → bms.* storage keys.
 *
 * Reads legacy user and role data stored under nbr.* keys, converts to the
 * BmsUser / SystemRole models, and writes to bms.* keys.
 *
 * Rules:
 * - Runs each missing migration step in order, guarded by a stored version.
 * - Preserves existing IDs; generates new ones only when missing.
 * - Falls back safely when old data is missing or malformed.
 * - Does NOT delete nbr.* keys so legacy read paths remain safe.
 * - Prevents duplicate migration via a localStorage version flag.
 *
 * Version history:
 *   1 — Initial migration of users and roles from nbr.* to bms.*.
 *   2 — Re-sweep nbr.userRegistry.customUsers for users added after v1 ran
 *       (those were written there by the old UserFormModal dual-write path).
 *   3 — Migrate roles from bms.roles (legacy SystemRole shape) and
 *       nbr.roleRegistry.customRoles to bms.roles.canonical (BmsRole shape).
 */

import type { BmsUser } from "../data/bmsUsers";
import { systemUserToBmsUser } from "../data/bmsUsers";
import type { BmsRole } from "../data/bmsRoles";
import type { SystemUser, SystemRole } from "../data/mockData";
import type { OrgUnit } from "../data/boardMeetingData";
import { migrateParentNamesToIds } from "./orgHierarchy";
import { migrateGovernanceMemberships } from "./migrateGovernanceMemberships";

// ── Constants ──────────────────────────────────────────────────────────────────

const MIGRATION_VERSION_KEY     = "bms.migration.version";
const CURRENT_MIGRATION_VERSION = 6;

// Legacy source keys
const LEGACY_USERS_KEY = "nbr.userRegistry.customUsers";
const LEGACY_ROLES_KEY = "nbr.roleRegistry.customRoles";

// Canonical destination keys
const BMS_USERS_KEY          = "bms.users";
const BMS_ROLES_KEY          = "bms.roles";           // legacy intermediate
const BMS_ROLES_CANONICAL_KEY = "bms.roles.canonical"; // v3+ target

// ── Helpers ────────────────────────────────────────────────────────────────────

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable (SSR, private-browsing quota)
  }
}

function getMigrationVersion(): number {
  const raw = localStorage.getItem(MIGRATION_VERSION_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function setMigrationVersion(version: number): void {
  localStorage.setItem(MIGRATION_VERSION_KEY, String(version));
}

function generateId(): string {
  return `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── User migration (shared logic) ─────────────────────────────────────────────

function mergeUsersFromLegacy(): void {
  const legacy = readJson<SystemUser[]>(LEGACY_USERS_KEY);
  if (!legacy || !Array.isArray(legacy) || legacy.length === 0) return;

  const existing = readJson<BmsUser[]>(BMS_USERS_KEY) ?? [];
  const existingIds = new Set(existing.map(u => u.id));

  const toAdd: BmsUser[] = [];
  for (const raw of legacy) {
    if (existingIds.has(raw.id)) continue;
    const user: SystemUser = {
      id:           raw.id ?? generateId(),
      name:         raw.name ?? "",
      employeeId:   raw.employeeId ?? "",
      email:        raw.email ?? "",
      phone:        raw.phone ?? "",
      designation:  raw.designation ?? "",
      circle:       raw.circle ?? "",
      zone:         raw.zone ?? "",
      level:        raw.level ?? "",
      role:         raw.role ?? "",
      status:       (raw.status as SystemUser["status"]) ?? "Inactive",
      lastActive:   raw.lastActive ?? "",
      sendInvite:   raw.sendInvite ?? false,
      twoFA:        raw.twoFA ?? false,
      accountActive: raw.accountActive ?? false,
    };
    toAdd.push(systemUserToBmsUser(user));
  }

  if (toAdd.length > 0) {
    writeJson(BMS_USERS_KEY, [...toAdd, ...existing]);
    dispatchEvent(new CustomEvent("bms:users-updated"));
  }
}

// ── Role migration ─────────────────────────────────────────────────────────────

function migrateRoles(): void {
  const legacy = readJson<SystemRole[]>(LEGACY_ROLES_KEY);
  if (!legacy || !Array.isArray(legacy) || legacy.length === 0) return;

  const existing = readJson<SystemRole[]>(BMS_ROLES_KEY) ?? [];
  const existingIds = new Set(existing.map(r => r.id));

  const toAdd: SystemRole[] = [];
  for (const raw of legacy) {
    if (existingIds.has(raw.id)) continue;
    toAdd.push({
      id:          raw.id ?? generateId(),
      name:        raw.name ?? "",
      description: raw.description ?? "",
      level:       raw.level ?? "",
      status:      raw.status ?? "Inactive",
      usersCount:  raw.usersCount ?? 0,
      permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    });
  }

  if (toAdd.length > 0) {
    writeJson(BMS_ROLES_KEY, [...toAdd, ...existing]);
    dispatchEvent(new CustomEvent("bms:roles-updated"));
  }
}

// ── Canonical role migration (v3) ─────────────────────────────────────────────

function migrateRolesToCanonical(): void {
  // Collect sources: bms.roles (intermediate) + nbr.roleRegistry.customRoles (legacy)
  const fromIntermediate = readJson<SystemRole[]>(BMS_ROLES_KEY) ?? [];
  const fromLegacy       = readJson<SystemRole[]>(LEGACY_ROLES_KEY) ?? [];

  // Merge, preferring intermediate over legacy for same id
  const byId = new Map<string, SystemRole>();
  for (const r of fromLegacy)       byId.set(r.id, r);
  for (const r of fromIntermediate) byId.set(r.id, r);

  const allSource = [...byId.values()];
  if (allSource.length === 0) return;

  const existing = readJson<BmsRole[]>(BMS_ROLES_CANONICAL_KEY) ?? [];
  const existingIds = new Set(existing.map(r => r.id));

  const toAdd: BmsRole[] = [];
  for (const raw of allSource) {
    if (existingIds.has(raw.id)) continue;
    toAdd.push({
      id:             raw.id ?? generateId(),
      created_at:     new Date().toISOString(),
      name:           raw.name ?? "",
      description:    raw.description,
      permission_ids: Array.isArray(raw.permissions) ? raw.permissions : [],
      status:         raw.status ?? "Inactive",
      level:          raw.level,
      usersCount:     raw.usersCount ?? 0,
      is_system_role: false,
    });
  }

  if (toAdd.length > 0) {
    writeJson(BMS_ROLES_CANONICAL_KEY, [...toAdd, ...existing]);
    dispatchEvent(new CustomEvent("bms:roles-updated"));
  }
}

// ── Org-unit parent-ID migration (v4) ─────────────────────────────────────────

function migrateOrgParentIds(): void {
  const units = readJson<OrgUnit[]>("bms.orgunits");
  if (!units || !Array.isArray(units) || units.length === 0) return;

  const migrated = migrateParentNamesToIds(units);
  // Only write when something changed
  const changed = migrated.some((m, i) => m.parent_unit_id !== units[i].parent_unit_id);
  if (changed) {
    writeJson("bms.orgunits", migrated);
    dispatchEvent(new CustomEvent("bms:orgunits-updated"));
  }
}

// ── Governance membership migration (v5) ──────────────────────────────────────

function migrateGovernanceMembershipsStep(): void {
  const legacy      = readJson<unknown[]>("bms.memberships") ?? [];
  const canonical   = readJson<unknown[]>("bms.governance_memberships") ?? [];
  const govBodies   = readJson<unknown[]>("bms.govbodies") ?? [];
  const users       = readJson<BmsUser[]>("bms.users") ?? [];

  if (legacy.length === 0) return;

  const result = migrateGovernanceMemberships(
    legacy as Parameters<typeof migrateGovernanceMemberships>[0],
    canonical as Parameters<typeof migrateGovernanceMemberships>[1],
    govBodies as Parameters<typeof migrateGovernanceMemberships>[2],
    users,
  );

  if (result.toAdd.length === 0) return;

  const now = new Date().toISOString();
  const newRecords = result.toAdd.map((r, i) => ({
    id: `migrated-gm-${Date.now()}-${i}`,
    created_at: now,
    ...r,
  }));

  writeJson("bms.governance_memberships", [...canonical, ...newRecords]);
  dispatchEvent(new CustomEvent("bms:governance-memberships-updated"));
}

// ── Org-unit user links migration (v6) ────────────────────────────────────────
// For users that have no org-unit IDs, try to match their `circle` display field
// to an exact org-unit name. Only when one unique exact match exists.

function migrateUserOrgLinks(): void {
  const users = readJson<BmsUser[]>("bms.users") ?? [];
  const units = readJson<OrgUnit[]>("bms.orgunits") ?? [];

  if (users.length === 0 || units.length === 0) return;

  // Build name→unit map; skip any name that maps to multiple units (ambiguous)
  const nameCount = new Map<string, number>();
  for (const u of units) nameCount.set(u.unit_name, (nameCount.get(u.unit_name) ?? 0) + 1);
  const uniqueByName = new Map<string, OrgUnit>();
  for (const u of units) {
    if ((nameCount.get(u.unit_name) ?? 0) === 1) uniqueByName.set(u.unit_name, u);
  }

  let changed = false;
  const updated = users.map(u => {
    // Skip users that already have at least one org-unit link
    if (u.primary_org_unit_id || u.division_id || u.department_id || u.branch_id) return u;

    const candidate = uniqueByName.get(u.circle ?? "");
    if (!candidate) return u;

    const patch: Partial<BmsUser> = { primary_org_unit_id: candidate.id };
    if (candidate.unit_type === "Division")   patch.division_id   = candidate.id;
    if (candidate.unit_type === "Department") patch.department_id = candidate.id;
    if (candidate.unit_type === "Branch")     patch.branch_id     = candidate.id;

    changed = true;
    return { ...u, ...patch };
  });

  if (changed) {
    writeJson("bms.users", updated);
    dispatchEvent(new CustomEvent("bms:users-updated"));
  }
}

// ── Migration steps ────────────────────────────────────────────────────────────

function runVersion1(): void {
  mergeUsersFromLegacy();
  migrateRoles();
}

function runVersion2(): void {
  // Re-sweep nbr.* for users written there by the old dual-write path that ran
  // between when v1 migrated and when we removed the dual-write in UserFormModal.
  mergeUsersFromLegacy();
}

function runVersion3(): void {
  // Migrate roles from legacy SystemRole format into canonical BmsRole format
  // stored at bms.roles.canonical.
  migrateRolesToCanonical();
}

function runVersion4(): void {
  // Migrate org-unit parent relationships from display strings to stable IDs.
  migrateOrgParentIds();
}

function runVersion5(): void {
  // Migrate legacy governance memberships (bms.memberships) to canonical registry
  // (bms.governance_memberships). Idempotent — only adds records with no matching
  // (user_id, gov_body_id) pair in the canonical store.
  migrateGovernanceMembershipsStep();
}

function runVersion6(): void {
  // For users with no org-unit IDs, attempt to resolve their legacy `circle` display
  // field to an exact unique org-unit name and set the corresponding stable ID fields.
  migrateUserOrgLinks();
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Run all pending migration steps.
 * Safe to call on every app startup — already-applied steps are skipped.
 */
export function runBmsMigrationIfNeeded(): void {
  try {
    const current = getMigrationVersion();
    if (current >= CURRENT_MIGRATION_VERSION) return;

    if (current < 1) runVersion1();
    if (current < 2) runVersion2();
    if (current < 3) runVersion3();
    if (current < 4) runVersion4();
    if (current < 5) runVersion5();
    if (current < 6) runVersion6();

    setMigrationVersion(CURRENT_MIGRATION_VERSION);
  } catch {
    // Never crash the app due to a migration failure
  }
}

/**
 * Reset the migration version so it will re-run on the next startup.
 * Intended for development / testing only.
 */
export function resetMigration(): void {
  localStorage.removeItem(MIGRATION_VERSION_KEY);
}

/**
 * Returns the current stored migration version number.
 */
export function getMigrationVersionNumber(): number {
  return getMigrationVersion();
}
