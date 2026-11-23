/**
 * Confirm that an administrator's role assignment was actually committed.
 *
 * An HTTP 200 alone is not proof. Only the authenticated Super Admin access
 * snapshot provides server readback for user/role relationships. This helper
 * does not grant permissions, and rejects stale/partial server responses.
 */
export interface RoleAssignmentReadback {
  loaded: boolean;
  is_super_admin: boolean;
  user_assignments: readonly { user_id: string; role_id: string }[];
}

const unverified = (): never => {
  throw new Error("The role change could not be verified. Reload User Management and check the assigned roles before retrying.");
};

export function requireRoleAssignmentReadback(
  acknowledgement: unknown,
  snapshot: RoleAssignmentReadback,
  userId: string,
  requestedRoleIds: readonly string[],
): void {
  if (!acknowledgement || typeof acknowledgement !== "object"
    || (acknowledgement as { ok?: unknown }).ok !== true) unverified();
  if (!snapshot?.loaded || snapshot.is_super_admin !== true
    || !Array.isArray(snapshot.user_assignments)) unverified();
  if (!userId || !Array.isArray(requestedRoleIds)
    || requestedRoleIds.some(id => typeof id !== "string" || !id)) unverified();

  const expected = new Set(requestedRoleIds);
  if (expected.size !== requestedRoleIds.length) unverified();
  const actual = snapshot.user_assignments
    .filter(item => item.user_id === userId).map(item => item.role_id);
  if (actual.length !== expected.size || actual.some(id => !expected.has(id))) unverified();
}
