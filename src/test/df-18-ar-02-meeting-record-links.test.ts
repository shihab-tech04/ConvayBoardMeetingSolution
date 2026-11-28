import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveRecordMeeting, selectMeetingRecordLinks } from '../app/pages/archive-reports/meetingRecordLinks';
const a = { id: 'row-a', meeting_id: 'M-1' };
const b = { id: 'row-b', meeting_id: 'M-2' };
const meetings = [a, b];
const select = (rows: { id: string; meeting_id?: string; source_meeting?: string }[]) => selectMeetingRecordLinks(meetings, a, rows);
describe('DF-18/AR-02/08 meeting record identity and link integrity', () => {
  it('resolves canonical and unique business IDs without guessing a title', () => {
    expect(resolveRecordMeeting(meetings, 'row-a')).toBe(a);
    expect(resolveRecordMeeting(meetings, 'M-1')).toBe(a);
    expect(resolveRecordMeeting(meetings, 'unknown')).toBeUndefined();
    expect(resolveRecordMeeting(meetings, ' M-1 ')).toBeUndefined();
  });
  it('rejects collisions and duplicate records', () => {
    expect(resolveRecordMeeting([a, { ...b, meeting_id: 'M-1' }], 'M-1')).toBeUndefined();
    expect(resolveRecordMeeting([a, { ...b, meeting_id: 'row-a' }], 'row-a')).toBeUndefined();
    expect(resolveRecordMeeting([a, a], 'row-a')).toBeUndefined();
  });
  it('accepts consistent canonical/business references and legitimate single references', () => {
    const rows = [{ id: 'one', meeting_id: 'M-1', source_meeting: 'row-a' }, { id: 'two', source_meeting: 'row-a' }, { id: 'three', meeting_id: 'M-1' }];
    expect(select(rows)).toEqual({ rows, integrityError: null });
  });
  it.each(['M-2', 'unknown', ' row-a '])('rejects contradictory or unresolved second reference %s', source_meeting => {
    const result = select([{ id: 'one', meeting_id: 'M-1', source_meeting }]);
    expect(result.rows).toEqual([]);
    expect(result.integrityError).toBeTruthy();
  });
  it('rejects ambiguous alias and duplicate linked IDs without claiming a valid count', () => {
    expect(selectMeetingRecordLinks([a, { ...b, meeting_id: 'M-1' }], a, [{ id: 'one', meeting_id: 'M-1' }]).integrityError).toBeTruthy();
    const result = select([{ id: 'one', meeting_id: 'M-1' }, { id: 'one', meeting_id: 'M-2' }]);
    expect(result.rows).toEqual([]);
    expect(result.integrityError).toBeTruthy();
  });
  it('does not import unrelated authorized rows into the selected meeting', () => {
    expect(select([{ id: 'other', meeting_id: 'M-2' }, { id: 'orphan' }])).toEqual({ rows: [], integrityError: null });
  });
  it('wires the three linked registries and truthful counts on the actual page', () => {
    const page = readFileSync('src/app/pages/archive-reports/MeetingRecordPage.tsx', 'utf8');
    expect(page).toContain('resolveRecordMeeting(meetingReg.items, meetingId)');
    for (const reg of ['decision', 'resolution', 'action']) {
      expect(page).toContain(`selectMeetingRecordLinks(meetingReg.items, meeting, ${reg}Reg.items)`);
      expect(page).toContain(`${reg}Reg.error || (!${reg}Reg.loading && ${reg}Links.integrityError)`);
      expect(page).toContain(`{${reg}ReadError || ${reg}Reg.loading ? (`);
    }
  });
});
