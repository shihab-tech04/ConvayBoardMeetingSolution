/** WS1 pre-meeting read model. SQL records, not check-in timestamps alone,
 * determine attendance. The online attendance provider owns active-session writes. */
export const READINESS_STATES = ["Not Joined", "Present", "Temporarily Away", "Left", "Excused", "Recused"] as const;
export type ReadinessAttendance = (typeof READINESS_STATES)[number];
export const PRESENT_STATES: readonly ReadinessAttendance[] = ["Present", "Temporarily Away"];

interface AssignedParticipant { meeting_id: string; user_id: string }
interface AttendanceSourceRow {
  meeting_id: string;
  participant_id: string;
  attendance_status?: unknown;
  check_in_time?: unknown;
  check_out_time?: unknown;
  live_session_id?: unknown;
  session_id?: unknown;
}
export interface ReadinessAttendanceReadback {
  values: Record<string, ReadinessAttendance>;
  conflicts: string[];
}
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

/** Only use rows within the caller's known meeting/session scope. Legacy
 * unscoped records may be consumed during a first-session/pre-start review;
 * never attribute them to a reopened or explicitly scoped session. */
export function readReadinessAttendance(
  meetingId: string,
  assignments: readonly AssignedParticipant[],
  records: readonly AttendanceSourceRow[],
  scope: { sessionId?: string; reopened?: boolean } = {},
): ReadinessAttendanceReadback {
  const users = [...new Set(assignments.filter(a => a.meeting_id === meetingId && a.user_id).map(a => a.user_id))];
  const values: Record<string, ReadinessAttendance> = Object.create(null);
  const conflicts: string[] = [];
  const sessionId = text(scope.sessionId);
  for (const userId of users) {
    values[userId] = "Not Joined";
    const before = conflicts.length;
    const rows = records.filter(row => row.meeting_id === meetingId && row.participant_id === userId).filter(row => {
      const canonical = text(row.live_session_id);
      const alternate = text(row.session_id);
      if (canonical && alternate && canonical !== alternate) {
        conflicts.push(`Conflicting attendance session identity for ${userId}`);
        return false;
      }
      const rowSession = canonical || alternate;
      return sessionId ? rowSession === sessionId : !scope.reopened && !rowSession;
    });
    if (conflicts.length !== before) continue;
    if (rows.length > 1) {
      conflicts.push(`Duplicate attendance records for ${userId}`);
      continue;
    }
    const row = rows[0];
    if (!row) continue;
    if (row.attendance_status !== undefined && row.attendance_status !== null) {
      if (READINESS_STATES.includes(row.attendance_status as ReadinessAttendance)) {
        values[userId] = row.attendance_status as ReadinessAttendance;
      } else conflicts.push(`Invalid attendance status for ${userId}`);
    } else if (text(row.check_out_time)) {
      values[userId] = "Left";
    } else if (text(row.check_in_time)) {
      values[userId] = "Present";
    }
  }
  return { values, conflicts };
}

/** A pre-start attendance selection is not a provider presence event. Keep
 * prior check-in/out evidence and persist the explicit SQL state. */
export function readinessAttendancePatch(
  existing: Pick<AttendanceSourceRow, "check_in_time" | "check_out_time"> | undefined,
  status: ReadinessAttendance,
  now: string,
): { attendance_status: ReadinessAttendance; check_in_time: string; check_out_time: string } {
  const priorIn = text(existing?.check_in_time);
  const priorOut = text(existing?.check_out_time);
  const present = PRESENT_STATES.includes(status);
  return {
    attendance_status: status,
    check_in_time: present ? (priorOut ? now : priorIn || now) : priorIn,
    check_out_time: present ? "" : status === "Left" && priorIn ? priorOut || now : priorOut,
  };
}
