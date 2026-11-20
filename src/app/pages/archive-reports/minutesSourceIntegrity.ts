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
  approval_status: string;
}

const CAN_DRAFT_FROM = new Set(["Completed", "Closed", "Awaiting Minutes"]);

export function resolveMinutesSource(
  meetingId: unknown,
  meetingTitle: unknown,
  meetings: readonly MinutesSourceMeeting[],
): Pick<MinutesSourceMeeting, "meeting_id" | "meeting_title" | "meeting_date"> {
  const requestedId = typeof meetingId === "string" ? meetingId.trim() : "";
  const requestedTitle = typeof meetingTitle === "string" ? meetingTitle.trim() : "";
  if (!requestedId) throw new Error("Select a completed meeting before creating minutes.");

  // Do not trust a free-typed meeting title or reference for official minutes.
  const source = meetings.find(meeting => meeting.meeting_id === requestedId);
  if (!source) throw new Error("Meeting was not found in your accessible meeting register. Refresh and try again.");
  if (!CAN_DRAFT_FROM.has(source.approval_status)) {
    throw new Error("Minutes can only be drafted for a completed or closed meeting awaiting minutes.");
  }
  if (!requestedTitle || requestedTitle !== source.meeting_title.trim()) {
    throw new Error("Meeting title does not match the selected meeting. Use the current title from the meeting register.");
  }
  return {
    meeting_id: source.meeting_id,
    meeting_title: source.meeting_title,
    meeting_date: source.meeting_date,
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
