export interface MeetingDraftRecordIdentity {
  id: string;
  meeting_id?: string;
  approval_status?: string;
  status?: string;
}

export interface MeetingDraftTarget {
  recordId: string;
  meetingId: string;
}

/** Resolve a resumed draft to its stable registry identity and reject stale IDs. */
export function resolveMeetingDraftTarget(
  draftId: string | undefined,
  meetings: readonly MeetingDraftRecordIdentity[],
): MeetingDraftTarget | null {
  const requestedId = String(draftId ?? "").trim();
  if (!requestedId) return null;

  const meeting = meetings.find(item => item.id === requestedId || item.meeting_id === requestedId);
  if (!meeting) {
    throw new Error("This draft is no longer available. Refresh the meeting register and try again.");
  }

  const status = String(meeting.approval_status ?? meeting.status ?? "").trim().toLowerCase();
  if (status !== "draft") {
    throw new Error("Only a meeting in Draft status can be continued.");
  }

  return {
    recordId: meeting.id,
    meetingId: String(meeting.meeting_id ?? meeting.id),
  };
}
