/** RP-02: scoped SQL evidence, never inferred from participant_count or names. */
export const PARTICIPATION_ENTITIES = ["bms.meetings", "bms.liveSessions", "bms.attendance"] as const;
type EvidenceEntity = typeof PARTICIPATION_ENTITIES[number];
export interface ParticipationEvidenceRow {
  entity_key: EvidenceEntity;
  record_id: string;
  tenant_id: string | null;
  payload: Record<string, unknown>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Every row carries SQL scope, not a tenant guessed from the payload. */
export function parseParticipationEvidence(raw: unknown): ParticipationEvidenceRow[] {
  if (!Array.isArray(raw)) throw new Error("Invalid participation report response");
  const seen = new Set<string>();
  return raw.map(row => {
    if (!object(row) || !PARTICIPATION_ENTITIES.includes(row.entity_key as EvidenceEntity) ||
        !text(row.record_id) || (row.tenant_id !== null && (typeof row.tenant_id !== "string" || !UUID.test(row.tenant_id))) ||
        !object(row.payload) || row.payload.id !== row.record_id) {
      throw new Error("Invalid participation record identity or tenant scope");
    }
    const key = JSON.stringify([row.entity_key, row.record_id]);
    if (seen.has(key)) throw new Error("Duplicate participation record identity");
    seen.add(key);
    return row as unknown as ParticipationEvidenceRow;
  });
}

/** Require timezone-bearing persisted timestamps; never guess local time. */
function timestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3])(?::?[0-5]\d)?)$/i.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return null;
  const parsed = Date.parse(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isFinite(parsed) ? parsed : null;
}
const scopedKey = (scope: string | null, reference: string) => JSON.stringify([scope, reference]);

/** Counts observed, session-linked check-ins, not attendance rates or provider
 * verification. Reconnects and multiple sessions count one participant per meeting.
 * Unlinked legacy/pre-start records and missing history are not evidence of absence.
 */
export function recordedSessionCheckIns(rows: readonly ParticipationEvidenceRow[]): Map<string, number> {
  const meetings = rows.filter(row => row.entity_key === "bms.meetings");
  const aliases = new Map<string, Set<string>>();
  for (const meeting of meetings) {
    for (const alias of [meeting.record_id, text(meeting.payload.meeting_id)]) {
      if (!alias) continue;
      const key = scopedKey(meeting.tenant_id, alias);
      const ids = aliases.get(key) ?? new Set<string>();
      ids.add(meeting.record_id);
      aliases.set(key, ids);
    }
  }
  const resolveMeeting = (row: ParticipationEvidenceRow) => {
    const ids = aliases.get(scopedKey(row.tenant_id, text(row.payload.meeting_id)));
    return ids?.size === 1 ? [...ids][0] : null;
  };
  const sessions = new Map<string, { meetingId: string; start: number; end: number | null }>();
  for (const row of rows) {
    if (row.entity_key !== "bms.liveSessions") continue;
    const meetingId = resolveMeeting(row);
    const start = timestamp(row.payload.started_at);
    const end = timestamp(row.payload.ended_at);
    const status = text(row.payload.session_status);
    if (!meetingId || start === null || !["active", "paused", "ended"].includes(status) ||
        (status === "ended" && end === null) || (end !== null && end < start) ||
        (text(row.payload.ended_at) && end === null)) continue;
    sessions.set(scopedKey(row.tenant_id, row.record_id), { meetingId, start, end });
  }
  const byMeeting = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.entity_key !== "bms.attendance") continue;
    const meetingId = resolveMeeting(row), participant = text(row.payload.participant_id);
    const canonical = text(row.payload.live_session_id), alternate = text(row.payload.session_id);
    if (!meetingId || !participant || (!canonical && !alternate) || (canonical && alternate && canonical !== alternate)) continue;
    const session = sessions.get(scopedKey(row.tenant_id, canonical || alternate));
    const at = timestamp(row.payload.check_in_time);
    const status = text(row.payload.attendance_status);
    // Status-only, absent, pre-meeting and malformed records cannot prove a join.
    if (!session || session.meetingId !== meetingId || at === null || at < session.start ||
        (session.end !== null && at > session.end) ||
        (status && !["Present", "Temporarily Away", "Left", "Excused", "Recused"].includes(status))) continue;
    const people = byMeeting.get(meetingId) ?? new Set<string>();
    people.add(participant);
    byMeeting.set(meetingId, people);
  }
  return new Map([...byMeeting].map(([id, people]) => [id, people.size]));
}

/** Exact PostgREST pagination: a truncated or changed total is not a full read. */
export function verifyParticipationPage(contentRange: string | null, offset: number, size: number, previousTotal?: number): number {
  const match = /^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(contentRange ?? "");
  if (!match) throw new Error("Participation report completeness could not be verified");
  const total = Number(match[3]);
  if (!Number.isSafeInteger(total) || total < 0 || total > 100000 ||
      (previousTotal !== undefined && total !== previousTotal) ||
      (size === 0 ? total !== 0 || offset !== 0 || match[1] !== undefined :
        Number(match[1]) !== offset || Number(match[2]) !== offset + size - 1 || offset + size > total)) {
    throw new Error("Participation report changed or is incomplete. Refresh and retry.");
  }
  return total;
}
