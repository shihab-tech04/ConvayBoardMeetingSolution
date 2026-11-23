/** AC-05 permission-editor lifecycle.
 * Preserve the in-progress draft across refreshed access snapshots and
 * do not report completion or permit dismissal during an in-flight write.
 * Does not grant permissions or change server authorization.
 */
export interface PermissionDraftHydrationState {
  open: boolean;
  identity: string;
  hydratedIdentity: string | null;
  groupsReady: boolean;
  saving: boolean;
}
export function shouldHydratePermissionDraft(state: PermissionDraftHydrationState): boolean {
  if (!state.open || !state.groupsReady || state.saving) return false;
  return state.hydratedIdentity !== state.identity;
}
export function mayDismissPermissionDraft(inFlight: boolean): boolean {
  return !inFlight;
}
