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

  // MT-14: a human meeting ID and a registry record ID are alternate
  // references to the same record, never permission to select the first
  // ambiguous hit. Prevent unintended overwrite when IDs collide.
  const matches = meetings.filter(item =>
    item.id === requestedId || item.meeting_id === requestedId,
  );
  if (matches.length === 0) {
    throw new Error("This draft is no longer available. Refresh the meeting register and try again.");
  }
  if (matches.length !== 1) {
    throw new Error("The meeting identifier is ambiguous. Refresh the register and resolve duplicate meeting IDs.");
  }
  const meeting = matches[0];
  const approval = String(meeting.approval_status ?? "").trim().toLowerCase();
  const lifecycle = String(meeting.status ?? "").trim().toLowerCase();
  const status = approval || lifecycle;
  if (status !== "draft" || (lifecycle !== "" && lifecycle !== "draft")) {
    throw new Error("Only a meeting in Draft status can be continued.");
  }

  return {
    recordId: meeting.id,
    meetingId: String(meeting.meeting_id ?? meeting.id),
  };
}
