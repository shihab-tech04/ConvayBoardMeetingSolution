/** Contextual editor protection for legacy participant projections. No role is inferred from a title. */
export function contextualLeadershipRemovalBlocker(meeting: Record<string, unknown>, participant: { meeting_id: string; role: string; name: string; user_id?: unknown }): string | null {
  const mid = String(meeting.meeting_id ?? meeting.id ?? "").trim();
  if (!mid || participant.meeting_id !== mid) return "The participant does not belong to this meeting.";
  const fields = ["chairperson", "secretary", "organizer"] as const;
  const normalized = (value: unknown) => String(value ?? "").trim().split(" — ")[0].trim().toLowerCase();
  const userId = String(participant.user_id ?? "").trim();
  const ids = fields.map(field => String(meeting[`${field}_user_id`] ?? "").trim()).filter(Boolean);
  if (userId && ids.includes(userId)) return "Required meeting leadership cannot be removed. Replace the leader through Meeting Details first.";
  if (["chairperson", "meeting secretary", "secretary", "organizer", "meeting organizer"].includes(normalized(participant.role))) return "Required meeting leadership cannot be removed. Replace the leader through Meeting Details first.";
  // Legacy adapter records may lack a canonical user ID; never let such a row remove a named leader.
  const names = fields.map(field => normalized(meeting[field])).filter(Boolean);
  if (names.includes(normalized(participant.name))) return "Required meeting leadership cannot be removed. Replace the leader through Meeting Details first.";
  if (fields.some(field => !String(meeting[`${field}_user_id`] ?? "").trim() && !normalized(meeting[field]))) return "Meeting leadership identity is incomplete. Refresh Meeting Details before removing a participant.";
  return null;
}
