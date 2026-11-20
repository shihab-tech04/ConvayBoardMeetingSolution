/**
 * MN-01: Validate source linkage before creating a draft of board minutes.
 * This is a client preflight only. The authoritative SQL/RLS endpoint must
 * independently enforce meeting state, tenant and writer permissions.
 */
export interface MinutesSourceMeeting {
  id: string;
  meeting_id: string;
  meeting_title: string;
  meeting_date?: string;
  committee?: string;
  meeting_type?: string;
  mode?: string;
  venue?: string;
  time_zone?: string;
  confidentiality?: string;
  approval_status: string;
}

/** Immutable, source-derived details attached to a minutes version. */
export interface MinutesMeetingContext {
  committee: string;
  meeting_type: string;
  mode: string;
  venue: string;
  time_zone: string;
  confidentiality: string;
}


const CAN_DRAFT_FROM = new Set(["Completed", "Closed", "Awaiting Minutes"]);

export function resolveMinutesSource(
  meetingId: unknown,
  meetingTitle: unknown,
  meetings: readonly MinutesSourceMeeting[],
): Pick<MinutesSourceMeeting, "meeting_id" | "meeting_title" | "meeting_date"> & { meeting_context: MinutesMeetingContext } {
  const requestedId = typeof meetingId === "string" ? meetingId.trim() : "";
  const requestedTitle = typeof meetingTitle === "string" ? meetingTitle.trim() : "";
  if (!requestedId) throw new Error("Select a completed meeting before creating minutes.");

  // Do not trust a free-typed meeting title or reference for official minutes.
  const source = meetings.find(meeting => meeting.meeting_id === requestedId);
  if (!source) throw new Error("Meeting was not found in your accessible meeting register. Refresh and try again.");
  if (!CAN_DRAFT_FROM.has(source.approval_status)) {
    throw new Error("Minutes can only be drafted for a completed or closed meeting awaiting minutes.");
  }
  if (requestedTitle && requestedTitle !== source.meeting_title.trim()) {
    throw new Error("Meeting title does not match the selected meeting. Use the current title from the meeting register.");
  }
  return {
    meeting_id: source.meeting_id,
    meeting_title: source.meeting_title,
    meeting_date: source.meeting_date,
    meeting_context: {
      committee: source.committee ?? "",
      meeting_type: source.meeting_type ?? "",
      mode: source.mode ?? "",
      venue: source.venue ?? "",
      time_zone: source.time_zone ?? "",
      confidentiality: source.confidentiality ?? "",
    },
  };
}

/** MN-02: revision is a review-only action; never silently rewind signed records. */
const REVISION_REVIEW_STAGES = new Set([
  "Under Secretary Review", "Under Chairperson Review", "Member Review",
]);

export function validateMinutesRevisionRequest(status: string, instructions: unknown): string {
  if (!REVISION_REVIEW_STAGES.has(status)) {
    throw new Error("A revision may only be requested during minutes review.");
  }
  const reason = typeof instructions === "string" ? instructions.trim() : "";
  if (reason.length < 10) {
    throw new Error("Provide revision instructions of at least 10 characters.");
  }
  return reason;
}

/** Authors can repair returned minutes; finalized records remain read-only. */
export function isEditableMinutesStatus(status: string): boolean {
  return status === "Draft" || status === "Revision Requested";
}

/**
 * MN-02: explicit submission after editing. The frontend only proposes the
 * next version; the private SQL trigger must validate the transition, actor,
 * server-side source and immutable revision history for direct API callers.
 */
export function buildMinutesReviewSubmission(status: string, version: string) {
  if (status !== "Draft" && status !== "Revision Requested") {
    throw new Error("Only draft or returned minutes can be submitted for secretary review.");
  }
  if (!/^(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})$/.test(version)) {
    throw new Error("Minutes version is invalid. Refresh the record before submitting.");
  }
  const [major, minor] = version.split(".").map(Number);
  if (status === "Revision Requested" && minor >= 9999) {
    throw new Error("Minutes version limit reached. Contact the records administrator.");
  }
  return {
    approval_status: "Under Secretary Review",
    version: status === "Revision Requested" ? `${major}.${minor + 1}` : version,
  };
}

/**
 * State-checked minutes lifecycle commands. These are a UI preflight;
 * the trusted database must independently validate the current state, actor,
 * source meeting and audit evidence before accepting a transition.
 */
export type MinutesLifecycleAction =
  | "forward_review" | "approve_minutes" | "sign_minutes" | "archive_minutes";

export function isMinutesLifecycleAction(action: string): action is MinutesLifecycleAction {
  return action === "forward_review" || action === "approve_minutes" ||
    action === "sign_minutes" || action === "archive_minutes";
}

export function buildMinutesLifecycleTransition(status: string, action: MinutesLifecycleAction) {
  const target = action === "forward_review"
    ? status === "Under Secretary Review" ? "Under Chairperson Review"
      : status === "Under Chairperson Review" ? "Member Review" : null
    : action === "approve_minutes" && status === "Member Review" ? "Approved"
    : action === "sign_minutes" && status === "Approved" ? "Signed"
    : action === "archive_minutes" && status === "Signed" ? "Archived"
    : null;
  if (!target) {
    throw new Error("This minutes action is not permitted in the current review stage. Refresh and retry.");
  }
  return { approval_status: target };
}
