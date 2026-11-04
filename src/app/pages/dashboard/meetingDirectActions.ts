import type { ResolvedAction } from "../../actions/types";

/**
 * HM-05: hero and meeting-list actions are clickable. Never select a visible
 * but disabled action merely because it has a higher priority. The backend
 * authorization remains the final authority; this closes the frontend gate.
 */
export function selectAvailableDirectMeetingAction(
  actions: readonly ResolvedAction[],
): ResolvedAction | null {
  return actions
    .filter(action => action.visible && action.enabled && action.placement === "direct")
    .sort((a, b) => a.priority - b.priority)[0] ?? null;
}
