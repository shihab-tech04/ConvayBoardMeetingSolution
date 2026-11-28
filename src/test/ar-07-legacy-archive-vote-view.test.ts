import { describe, expect, it } from 'vitest';
import { legacyNamedArchiveVotes, recordedVoteCount } from '../app/pages/archive-reports/legacyArchiveVoteView';
const summary = { id:'sum', vote_id:'round', voter_name:'Summary', vote:'Passed', notes:'Open · Simple Majority' };
const ballot = { id:'b', vote_id:'round-u', ballot_session_id:'round', voter_id:'u', voter_name:'Member', vote:'For', notes:summary.notes };
describe('AR-07 legacy archive vote evidence', () => {
  it('preserves verified zero and rejects malformed totals', () => {
    expect(recordedVoteCount('0')).toBe(0);
    expect(recordedVoteCount('12')).toBe(12);
    for (const v of ['', '1x', '-1', '1.2', '9007199254740992', undefined]) expect(recordedVoteCount(v)).toBeNull();
  });
  it('retains only named ballots tied to one explicit non-secret summary', () => {
    expect(legacyNamedArchiveVotes([summary, ballot])).toEqual([ballot]);
    expect(legacyNamedArchiveVotes([summary])).toEqual([]);
    expect(legacyNamedArchiveVotes([ballot])).toEqual([]);
    expect(legacyNamedArchiveVotes([summary, summary, ballot])).toEqual([]);
    expect(legacyNamedArchiveVotes([{...summary, notes:'Secret Ballot · Simple Majority'}, ballot])).toEqual([]);
    expect(legacyNamedArchiveVotes([{...summary, voter_name:'Secret Ballot (anonymised)'}, ballot])).toEqual([]);
    expect(legacyNamedArchiveVotes([summary, {...ballot, notes:'Secret Ballot · Simple Majority'}])).toEqual([]);
    expect(legacyNamedArchiveVotes([summary, {...ballot, ballot_session_id:'other'}])).toEqual([]);
  });
});
