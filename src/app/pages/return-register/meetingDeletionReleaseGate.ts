/** MT-27: fail-closed production gate for Draft deletion until WS0 activates
 * the dedicated authenticated, tenant-owned, expected-revision SQL RPC.
 * No UI redesign or permission granting; keep the existing action in place.
 * A future activated backend must replace this constant only after end-to-end
 * authorization, native recovery and readback gates pass.
 */
export const DRAFT_DELETION_UNAVAILABLE_REASON =
  "Draft deletion is temporarily unavailable until secure server authorization is enabled.";

export function guardMeetingDrawerAction<T extends {
  id: string;
  enabled: boolean;
  disabledReason?: string;
}>(action: T): T {
  if (action.id !== "delete") return action;
  return {
    ...action,
    enabled: false,
    disabledReason: DRAFT_DELETION_UNAVAILABLE_REASON,
  };
}
