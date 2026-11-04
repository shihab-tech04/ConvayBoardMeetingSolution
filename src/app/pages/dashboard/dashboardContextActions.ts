import type { LiveMeetingEntryAction } from "../meetings/LiveMeetingWorkspace";

/**
 * HM-08 dashboard context actions.
 *
 * Live controls open the existing live workspace with the correct entry action.
 * Other operations navigate to the authoritative management workflow; do not
 * falsely advertise that clicking a dashboard button approves or mutates SQL.
 * Authorization and status transitions remain server enforced.
 */
export type DashboardMeetingDestination =
  | { kind: "live"; entryAction: LiveMeetingEntryAction; label: string }
  | { kind: "route"; path: string; label: string }
  | { kind: "details"; label: string };

const LIVE_ENTRIES: Record<string, { entryAction: LiveMeetingEntryAction; label: string }> = {
  start: { entryAction: "start_meeting", label: "Start meeting" },
  start_meeting: { entryAction: "start_meeting", label: "Start meeting" },
  join: { entryAction: "join_meeting", label: "Join meeting" },
  join_meeting: { entryAction: "join_meeting", label: "Join meeting" },
  rejoin: { entryAction: "rejoin_meeting", label: "Rejoin meeting" },
  rejoin_meeting: { entryAction: "rejoin_meeting", label: "Rejoin meeting" },
  continue_meeting: { entryAction: "continue_meeting", label: "Continue meeting" },
  resume_meeting: { entryAction: "resume_meeting", label: "Resume meeting" },
  resume_break: { entryAction: "resume_after_break", label: "Resume after break" },
  resume_after_break: { entryAction: "resume_after_break", label: "Resume after break" },
  resume_adjourned: { entryAction: "continue_meeting", label: "Resume adjourned meeting" },
  resume_adjourned_meeting: { entryAction: "continue_meeting", label: "Resume adjourned meeting" },
};

export function resolveDashboardMeetingDestination(
  actionId: string,
  meetingId: string,
): DashboardMeetingDestination {
  const live = LIVE_ENTRIES[actionId];
  if (live && meetingId.trim()) return { kind: "live", ...live };

  const recordPath = `/meetings/${encodeURIComponent(meetingId)}/record`;
  switch (actionId) {
    case "prepare_minutes":
    case "review_minutes":
      return { kind: "route", path: "/archive-reports/minutes", label: actionId === "prepare_minutes" ? "Prepare minutes" : "Review minutes" };
    case "approve":
    case "reject":
    case "request_revision":
    case "review_meeting":
      return { kind: "route", path: "/meetings/meeting-overview", label: "Review meeting approval" };
    case "continue_setup":
    case "submit_for_approval":
    case "publish":
    case "publish_meeting":
    case "edit":
    case "manage_participants":
    case "manage_rsvp":
      return { kind: "route", path: "/meetings/all-meetings", label: "Manage meeting" };
    case "view_record":
      return meetingId.trim()
        ? { kind: "route", path: recordPath, label: "View meeting record" }
        : { kind: "details", label: "View details" };
    case "create_next_meeting":
      return { kind: "route", path: "/meetings/all-meetings?create=1", label: "Create next meeting" };
    default:
      return { kind: "details", label: "View details" };
  }
}
