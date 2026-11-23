export const INVITATION_REDIRECT_TO =
  "https://shihab-tech04.github.io/ConvayBoardMeetingSolution/invite/accept";

export type InvitationAcceptanceContext = {
  authEmail: string | null | undefined;
  profileEmail: string | null | undefined;
  emailConfirmedAt: string | null | undefined;
  accountRole: string | null | undefined;
  accountStatus: string | null | undefined;
  invitationStatus: unknown;
};

export function buildInvitationOptions(displayName: string) {
  return {
    data: { display_name: displayName },
    redirectTo: INVITATION_REDIRECT_TO,
  };
}

export function mayAcceptInvitation(context: InvitationAcceptanceContext): boolean {
  const authEmail = context.authEmail?.trim().toLowerCase();
  const profileEmail = context.profileEmail?.trim().toLowerCase();
  return Boolean(
    context.emailConfirmedAt && authEmail && profileEmail && authEmail === profileEmail &&
    context.accountRole === "user" && ["inactive", "active"].includes(context.accountStatus ?? "") &&
    context.invitationStatus === "pending",
  );
}

/** Server-validated role selection. Client values alone never grant access. */
export interface InvitableRole {
  id: string;
  status: string;
  is_system_role: boolean;
}

const roleUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssignableInvitationRole(requestedId: unknown, role: InvitableRole | null | undefined): boolean {
  return typeof requestedId === "string" && roleUuid.test(requestedId)
    && !!role && role.id === requestedId
    && role.status === "Active" && role.is_system_role === false;
}

/**
 * An invitation can only be acknowledged as role-assigned after the server
 * reads back exactly one role link for this identity.
 */
export function hasExactInvitationRoleReadback(requestedId: string, rows: readonly { role_id: string }[] | null): boolean {
  return Array.isArray(rows) && rows.length === 1 && rows[0].role_id === requestedId;
}
