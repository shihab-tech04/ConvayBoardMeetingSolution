/** AR-02/08 and DF-18: resolve only unambiguous identities from the already
 * authorized meeting registry. This is display integrity, not server authorization. */
type MeetingIdentity = { id: string; meeting_id?: string };
type LinkedRecord = { id: string; meeting_id?: string; source_meeting?: string };
const key = (value: unknown) => typeof value === 'string' && value.trim() === value && value.length > 0 ? value : null;

export function resolveRecordMeeting<T extends MeetingIdentity>(meetings: readonly T[], reference: unknown): T | undefined {
  const ref = key(reference);
  if (!ref) return undefined;
  const matches = meetings.filter(m => key(m.id) === ref || key(m.meeting_id) === ref);
  if (matches.length !== 1 || !key(matches[0].id) || meetings.filter(m => m.id === matches[0].id).length !== 1) return undefined;
  return matches[0];
}

export function selectMeetingRecordLinks<T extends LinkedRecord>(meetings: readonly MeetingIdentity[], meeting: MeetingIdentity, records: readonly T[]): { rows: T[]; integrityError: string | null } {
  const aliases = new Set([key(meeting.id), key(meeting.meeting_id)].filter((v): v is string => v !== null));
  const rows: T[] = [];
  let integrityError: string | null = null;
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.id, (counts.get(record.id) ?? 0) + 1);
  for (const record of records) {
    const references = [record.meeting_id, record.source_meeting].filter(value => value !== undefined && value !== null && value !== '');
    if (!references.some(ref => typeof ref === 'string' && aliases.has(ref))) continue;
    // A valid link cannot override a contradictory, malformed, unresolved or ambiguous second link.
    if (!key(record.id) || counts.get(record.id) !== 1 || references.some(ref => resolveRecordMeeting(meetings, ref)?.id !== meeting.id)) {
      integrityError = 'Meeting record links could not be verified.';
      continue;
    }
    rows.push(record);
  }
  return { rows, integrityError };
}
