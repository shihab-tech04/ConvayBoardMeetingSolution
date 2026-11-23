import type { ResolvedAction } from "../../actions/types";
import { meetingStartWindowState } from "../../utils/meetingStartWindow";

export interface MeetingStartCardState {
  label: string;
  enabled: boolean;
  entryAction: "start_meeting" | "continue_meeting" | null;
  disabledReason: string;
}

/**
 * One visible meeting-card CTA, but never an implied permission grant.
 * The real start command/LiveKit token issuer independently checks the actor.
 */
export function resolveMeetingStartCardState(
  meeting: Record<string, unknown>,
  actions: readonly ResolvedAction[],
  now: Date = new Date(),
): MeetingStartCardState {
  const status = String(meeting.approval_status ?? meeting.status ?? "").trim().toLowerCase();
  const resumed = actions.find(a => a.id === "continue_meeting" && a.visible);
  const start = actions.find(a => (a.id === "start" || a.id === "start_meeting") && a.visible);
  const selected = resumed ?? start;
  const entryAction = resumed ? "continue_meeting" as const : start ? "start_meeting" as const : null;

  if (selected?.enabled && entryAction) {
    return {
      label: resumed ? "Continue Live Meeting" : "Start Meeting Now",
      enabled: true,
      entryAction,
      disabledReason: "",
    };
  }

  const timeWindow = meetingStartWindowState(meeting, now);
  const reason = selected?.disabledReason
    ?? (["scheduled", "rescheduled"].includes(status)
      ? timeWindow === "closed"
        ? "The scheduled start window has ended. Reschedule and publish before starting."
        : "Publish this scheduled meeting before starting it."
      : ["draft", "pending approval", "awaiting approval"].includes(status)
        ? "This meeting must be approved and published before it can start."
        : ["published", "ready to start"].includes(status)
          ? "Only an authorized meeting host may start this meeting, within its start window."
          : ["in progress", "paused", "on break"].includes(status)
            ? "Only an authorized host may resume this live meeting."
            : "This meeting is not currently startable.");
  return { label: "Start Meeting Now", enabled: false, entryAction: null, disabledReason: reason };
}
