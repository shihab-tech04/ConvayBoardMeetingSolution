/**
 * LM-19 client presentation guards. These are UX-only checks; the trusted
 * LiveKit token issuer must independently enforce presenter permissions.
 */
const POTENTIAL_PRESENTERS = new Set([
  "Chairperson", "Company Secretary", "Board Member", "Independent Director", "Presenter", "Administrator",
]);

export function mayOfferRegularScreenShare(role: string, canJoin: boolean): boolean {
  return canJoin && POTENTIAL_PRESENTERS.has(role);
}

/** Never display a live presentation based solely on the user's click. */
export function confirmedLocalScreenShare(
  participant: { isScreenShareEnabled?: boolean } | null | undefined,
): boolean {
  return participant?.isScreenShareEnabled === true;
}
