/**
 * UAM — distinguish a verified/invited identity from an authorized workspace
 * user. Auth activation never implies a role grant.
 */
export interface RoleAssignmentCandidate {
  user_id: string;
  account_role: string;
  account_status: string;
  invitation_status?: string | null;
}
export interface RoleLink { user_id: string; role_id: string }

/**
 * A new/active standard user without assigned roles needs admin attention.
 * Intentional deactivation and suspension are not silently re-enabled.
 */
export function needsRoleAssignment(
  user: RoleAssignmentCandidate,
  assignments: readonly RoleLink[],
): boolean {
  if (user.account_role === "super_admin") return false;
  if (user.account_status !== "active"
    && user.invitation_status !== "pending"
    && user.invitation_status !== "verified") return false;
  return !assignments.some(link => link.user_id === user.user_id);
}

/** The next step after sending an invite must not be falsely completed empty. */
export function canCompleteInvitationRoleStep(
  fromNewInvitation: boolean,
  selectedRoles: readonly string[],
): boolean {
  return !fromNewInvitation || selectedRoles.length > 0;
}
