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

/**
 * Compare full user names, never substring matches. A substring match between
 * "Ann" and "Anna" can accidentally place another user's record in My Tasks.
 * Legacy records can store a single name, an array, or comma/semicolon-
 * separated names; preserve those supported formats without fuzzy matching.
 *
 * This is a presentation filter, not an authorization boundary. Supabase RLS
 * must independently protect every record.
 */
function normalizeIdentityName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/^(mr|mrs|ms|dr)\.?\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function fieldMatchesUser(field: unknown, name: string): boolean {
  const expected = normalizeIdentityName(name);
  if (!expected || field == null) return false;
  if (Array.isArray(field)) return field.some(value => fieldMatchesUser(value, name));
  if (typeof field === "object") {
    if ("name" in field) return fieldMatchesUser(field.name, name);
    return false;
  }
  if (typeof field !== "string") return false;
  const raw = field.trim();
  if (!raw) return false;
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const values: unknown = JSON.parse(raw);
      if (Array.isArray(values)) return fieldMatchesUser(values, name);
    } catch { /* Malformed legacy value: still allow delimiter-based matching. */ }
  }
  return raw.split(/[,;|\n]+/).some(part => {
    const unlabelled = part.replace(/^[^:]+:\s*/, "").replace(/\s+\([^)]*\)\s*$/, "");
    return normalizeIdentityName(unlabelled) === expected;
  });
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

/**
 * Match only the user's assigned role/designation. Otherwise all workflow
 * users (including Secretaries and Admins) receive one another's tasks.
 */
function normalizeRoleName(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function roleFamily(value: string): "admin" | "secretary" | "" {
  if (["admin", "administrator", "super admin", "super administrator"].includes(value)) return "admin";
  if (["secretary", "company secretary", "secretariat"].includes(value)) return "secretary";
  return "";
}

export function roleAssignmentMatchesUser(
  assignedTo: unknown,
  accountRole?: string | null,
  designation?: string | null,
): boolean {
  if (typeof assignedTo !== "string") return false;
  const assigned = normalizeRoleName(assignedTo);
  if (!assigned) return false;
  const identities = [normalizeRoleName(accountRole), normalizeRoleName(designation)].filter(Boolean);
  if (identities.includes(assigned)) return true;
  const family = roleFamily(assigned);
  return Boolean(family && identities.some(identity => roleFamily(identity) === family));
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
