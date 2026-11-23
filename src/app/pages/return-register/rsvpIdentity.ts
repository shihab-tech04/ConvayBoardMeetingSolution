/** PT RSVP: browser preflight only. The server remains authoritative for actor, tenant and permissions. */
export interface RSVPMeeting {
  meeting_id: string;
  meeting_title: string;
}
export interface RSVPParticipant {
  meeting_id: string;
  participant_id: string;
  name: string;
  participant_name?: string;
}
export interface ResolvedRSVPIdentity {
  meeting_id: string;
  meeting_title: string;
  participant_id: string;
  participant_name: string;
  response: string;
  response_date: string;
}

const RESPONSE_OPTIONS = ["Accepted", "Declined", "Tentative", "Pending"] as const;

const valueOf = (input: unknown): string =>
  typeof input === "string" ? input.trim() : "";

/** Do not save an RSVP linked only by free-text labels or guessed first matches. */
export function resolveRSVPIdentity(
  values: Record<string, unknown>,
  meetings: readonly RSVPMeeting[],
  participants: readonly RSVPParticipant[],
): ResolvedRSVPIdentity {
  const meetingId = valueOf(values.meeting_id);
  const name = valueOf(values.participant_name);
  if (!meetingId || !name) throw new Error("Meeting and participant are required.");

  const meetingMatches = meetings.filter(m => valueOf(m.meeting_id) === meetingId);
  if (meetingMatches.length !== 1 || !valueOf(meetingMatches[0].meeting_title)) {
    throw new Error("The meeting is missing or ambiguous. Refresh and select an existing meeting.");
  }
  const participantMatches = participants.filter(p =>
    valueOf(p.meeting_id) === meetingId &&
    valueOf(p.participant_name ?? p.name) === name,
  );
  if (participantMatches.length !== 1 || !valueOf(participantMatches[0].participant_id)) {
    throw new Error("The participant is missing or ambiguous for this meeting. Refresh and select an assigned participant.");
  }

  const response = valueOf(values.response) || "Pending";
  if (!RESPONSE_OPTIONS.some(option => option === response)) {
    throw new Error("Select a valid RSVP response.");
  }
  const date = valueOf(values.response_date);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(date + "T00:00:00.000Z") : new Date(Number.NaN);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error("Enter a valid RSVP response date.");
  }
  return {
    meeting_id: meetingId,
    meeting_title: valueOf(meetingMatches[0].meeting_title),
    participant_id: valueOf(participantMatches[0].participant_id),
    participant_name: valueOf(participantMatches[0].participant_name ?? participantMatches[0].name),
    response,
    response_date: date,
  };
}
