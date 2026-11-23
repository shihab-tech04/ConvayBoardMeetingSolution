import { MEETING_TYPES } from "../../data/boardMeetingData";

export interface MeetingIdentity {
  meeting_title: string;
  meeting_type: string;
  committee: string;
}

export function normalizeMeetingIdentity(values: Record<string, unknown>): MeetingIdentity {
  return {
    meeting_title: String(values.meeting_title ?? "").trim(),
    meeting_type: String(values.meeting_type ?? "").trim(),
    committee: String(values.committee ?? "").trim(),
  };
}

export function validateMeetingIdentity(identity: MeetingIdentity): string[] {
  const errors: string[] = [];
  if (!identity.meeting_title) errors.push("Meeting title is required");
  if (!identity.meeting_type) errors.push("Meeting type is required");
  else if (!MEETING_TYPES.includes(identity.meeting_type)) errors.push("Select a valid meeting type");
  if (!identity.committee) errors.push("Governance body is required");
  return errors;
}
