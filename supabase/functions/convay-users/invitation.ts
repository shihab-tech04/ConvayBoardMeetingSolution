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
