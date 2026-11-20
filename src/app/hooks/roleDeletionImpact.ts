/**
 * WS-F RAM-05 / RAM-08: a deletion preflight cannot infer impact from labels,
 * browser-local users, or a stale/synthetic count.
 *
 * The authoritative convay-access snapshot returns current role assignments
 * and the SQL-calculated users_count. Both must agree. The server-side
 * role_delete check and ON DELETE RESTRICT FK remain the final authority.
 */
import type { AccessSnapshot } from "../services/supabase/convayAccess";

export type RoleDeletionImpact =
  | { status: "ready"; count: 0; userIds: []; message: string }
  | { status: "assigned"; count: number; userIds: string[]; message: string }
  | { status: "blocked"; count: null; userIds: []; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const blocked = (message: string): RoleDeletionImpact =>
  ({ status: "blocked", count: null, userIds: [], message });

export function roleDeletionImpact(
  snapshot: AccessSnapshot, roleId: string,
): RoleDeletionImpact {
  if (!snapshot.loaded || snapshot.error || !snapshot.is_super_admin)
    return blocked("Role assignments cannot be verified. Refresh and retry.");
  if (!UUID.test(roleId))
    return blocked("The selected role has an invalid identifier.");
  const matches = snapshot.roles.filter(role => role.id === roleId);
  if (matches.length !== 1)
    return blocked("The selected role is missing or ambiguous. Refresh and retry.");

  const role = matches[0];
  if (role.is_system_role)
    return blocked("The protected Super Admin role cannot be deleted.");

  if (!Array.isArray(snapshot.user_assignments) ||
    snapshot.user_assignments.some(a =>
      !a || typeof a.user_id !== "string" || !UUID.test(a.user_id) ||
      typeof a.role_id !== "string" || !UUID.test(a.role_id)))
    return blocked("The user-role assignment list is incomplete. Refresh and retry.");

  const userIds = snapshot.user_assignments
    .filter(a => a.role_id === roleId).map(a => a.user_id);
  if (!Number.isSafeInteger(role.users_count) || role.users_count < 0 ||
    role.users_count !== userIds.length ||
    new Set(userIds).size !== userIds.length)
    return blocked("Role assignment counts disagree with the server. Refresh and retry.");

  if (userIds.length) {
    const count = userIds.length;
    return {
      status: "assigned", count, userIds,
      message: `This role is assigned to ${count} ${count === 1 ? "user" : "users"}. Remove ${count === 1 ? "that assignment" : "those assignments"} before deleting it.`,
    };
  }
  return {
    status: "ready", count: 0, userIds: [],
    message: "No users are assigned to this role. Its deletion can be confirmed.",
  };
}

export function requireRoleUnassigned(
  snapshot: AccessSnapshot, roleId: string,
): void {
  const impact = roleDeletionImpact(snapshot, roleId);
  if (impact.status !== "ready") throw new Error(impact.message);
}
