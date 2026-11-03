/**
 * Organisation Hierarchy — Permission Engine (Phase O3)
 *
 * Deny-by-default permission model for organisational unit operations.
 *
 * Permissions are derived from the current user's BMS role assignments.
 * Any user without an explicit grant is denied.
 *
 * Roles that carry full org-management rights:
 *   - "System Admin" / "system_admin"
 *   - "Company Secretary" / "company_secretary"
 *   - "Super Admin"
 *
 * Roles with read-only access:
 *   - "Board Member", "CFO", "Auditor" (can view structure and history)
 *
 * Everyone else: view-only (structure only).
 */

import { useAccessSnapshot, hasAccess } from "../services/supabase/convayAccess";

// ── Permission keys ────────────────────────────────────────────────────────────

export type OrgPermission =
  | "view_structure"
  | "create_units"
  | "edit_units"
  | "move_units"
  | "assign_heads"
  | "assign_users"
  | "transfer_users"
  | "activate_units"
  | "deactivate_units"
  | "archive_units"
  | "view_history"
  | "view_audit";

export type OrgPermissions = Record<OrgPermission, boolean>;

// ── Role → permission mappings ─────────────────────────────────────────────────

const ALL: OrgPermission[] = [
  "view_structure", "create_units", "edit_units", "move_units",
  "assign_heads", "assign_users", "transfer_users",
  "activate_units", "deactivate_units", "archive_units",
  "view_history", "view_audit",
];

const READ_ONLY: OrgPermission[] = ["view_structure", "view_history", "view_audit"];

const MANAGEMENT: OrgPermission[] = [
  "view_structure", "create_units", "edit_units",
  "assign_heads", "assign_users", "transfer_users",
  "activate_units", "view_history", "view_audit",
];

/** Role name patterns (lowercased) that grant each permission tier. */
const FULL_ACCESS_ROLES = new Set([
  "system admin", "system_admin", "super admin", "superadmin",
  "company secretary", "company_secretary",
]);

const MANAGEMENT_ROLES = new Set([
  "hr manager", "hr_manager", "admin", "administrator",
  "org manager", "org_manager",
]);

const READ_ACCESS_ROLES = new Set([
  "board member", "cfo", "auditor", "observer",
]);

function buildPermissions(granted: OrgPermission[]): OrgPermissions {
  const grantSet = new Set(granted);
  return Object.fromEntries(
    ALL.map((p) => [p, grantSet.has(p)]),
  ) as OrgPermissions;
}

// ── Deny-by-default baseline ───────────────────────────────────────────────────

const DENY_ALL = buildPermissions([]);

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Returns a permissions record for the currently logged-in user.
 *
 * Always deny-by-default — only explicitly granted permissions return true.
 */
export function useOrgPermissions(): OrgPermissions {
  const access = useAccessSnapshot();
  const view = hasAccess("gov_org_view", access);
  const manage = hasAccess("gov_org_manage", access);
  const audit = hasAccess("admin_audit_log", access);
  return buildPermissions([
    ...(view || manage ? ["view_structure", "view_history"] as OrgPermission[] : []),
    ...(manage ? ["create_units", "edit_units", "move_units", "assign_heads",
      "assign_users", "transfer_users", "activate_units", "deactivate_units",
      "archive_units"] as OrgPermission[] : []),
    ...(audit ? ["view_audit"] as OrgPermission[] : []),
  ]);
}

/**
 * Pure function variant — useful in tests or non-React contexts.
 * `roleNames` should be lowercase role name strings.
 */
export function resolveOrgPermissions(
  roleNames: string[],
  designation?: string,
): OrgPermissions {
  for (const rn of roleNames) {
    if (FULL_ACCESS_ROLES.has(rn)) return buildPermissions(ALL);
    if (MANAGEMENT_ROLES.has(rn))  return buildPermissions(MANAGEMENT);
  }
  const isSecretary = designation?.toLowerCase().includes("secretary") ||
    designation?.toLowerCase().includes("admin");
  if (isSecretary) return buildPermissions(ALL);
  for (const rn of roleNames) {
    if (READ_ACCESS_ROLES.has(rn)) return buildPermissions(READ_ONLY);
  }
  return buildPermissions(["view_structure"]);
}
