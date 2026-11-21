/**
 * HM-03/HM-04: preserve the exact Action Item when the user enters from the
 * overview or calendar, not just from My Tasks.
 *
 * The destination page opens its drawer only after an authenticated registry
 * fetch returns that id. The URL is never an authorization bypass.
 */
export function actionItemDetailsPath(sourceId: string): string {
  const id = sourceId.trim();
  return id
    ? `/decisions-followup/action-items?view=${encodeURIComponent(id)}`
    : "/decisions-followup/action-items";
}
