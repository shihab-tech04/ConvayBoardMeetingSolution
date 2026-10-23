// Shared types and helpers for Home workspace pages (My Tasks + My Calendar)

export interface HomeTask {
  id: string;
  sourceId: string;
  sourceType:
    | "meeting"
    | "agenda-item"
    | "board-pack"
    | "rsvp"
    | "declaration"
    | "minutes"
    | "vote"
    | "signature"
    | "action-item";
  meetingId?: string;
  title: string;
  context: string;
  type: string;
  dueDate?: string;
  status: string;
  assigneeKey?: string;
}

export interface HomeCalendarEvent {
  id: string;
  sourceId: string;
  sourceType:
    | "meeting"
    | "board-pack"
    | "rsvp"
    | "action-item"
    | "minutes"
    | "vote"
    | "review";
  meetingId?: string;
  title: string;
  context: string;
  date: string;
  time?: string;
  eventType: "meeting" | "deadline" | "action" | "review";
  status: string;
  mode?: string;
  venue?: string;
}

/** Deduplicate tasks by sourceType + sourceId + assigneeKey */
export function deduplicateTasks(tasks: HomeTask[]): HomeTask[] {
  const seen = new Set<string>();
  return tasks.filter(t => {
    const key = `${t.sourceType}:${t.sourceId}:${t.assigneeKey ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** True when the field value matches the current user by name (case-insensitive substring) */
export function fieldMatchesUser(field: unknown, name: string): boolean {
  if (!name || !field) return false;
  const f = String(field).toLowerCase();
  const n = name.toLowerCase();
  return f.includes(n) || n.includes(f);
}

/** True when designation indicates secretary / secretariat / admin role */
export function isWorkflowRole(designation: string): boolean {
  const d = designation.toLowerCase();
  return (
    d.includes("secretary") ||
    d.includes("secretariat") ||
    d.includes("admin") ||
    d.includes("administrator")
  );
}

/** True when the user is chairperson, secretary, or organizer of the meeting record */
export function userIsInvolvedInMeeting(m: Record<string, unknown>, userName: string): boolean {
  return (
    fieldMatchesUser(m.chairperson, userName) ||
    fieldMatchesUser(m.secretary, userName) ||
    fieldMatchesUser(m.organizer, userName)
  );
}

/** True when the user is a named participant in the given meeting */
export function userIsParticipant(
  participants: Array<{ meeting_id: string; name: string }>,
  meetingId: string,
  userName: string,
): boolean {
  return participants.some(
    p => p.meeting_id === meetingId && fieldMatchesUser(p.name, userName),
  );
}

/** True when the user is minute taker or co-author for a minutes record */
export function userIsMinutesOwner(m: Record<string, unknown>, userName: string): boolean {
  return (
    fieldMatchesUser(m.minute_taker, userName) ||
    fieldMatchesUser(m.co_authors, userName)
  );
}
