/** Archive readback only. Legacy records lack a reliable method column; never
 * infer a named ballot from a display name or from missing method evidence. */
type LegacyVote = { id: string; vote_id: string; voter_name: string; vote: string; notes: string; ballot_session_id?: string; voter_id?: string };
export function recordedVoteCount(value: unknown): number | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : null;
}
export function legacyNamedArchiveVotes<T extends LegacyVote>(rows: readonly T[]): T[] {
  const summaries = rows.filter(r => r.voter_name === 'Summary' || r.voter_name === 'Secret Ballot (anonymised)');
  return rows.filter(row => {
    if (!row.ballot_session_id || !row.voter_id || !['For','Against','Abstain'].includes(row.vote)) return false;
    if (row.voter_name === 'Summary' || row.voter_name === 'Secret Ballot (anonymised)') return false;
    const matching = summaries.filter(s => s.vote_id === row.ballot_session_id);
    if (matching.length !== 1) return false;
    const summary = matching[0];
    const method = summary.notes?.split(' · ')[0];
    return summary.voter_name === 'Summary' && ['Passed','Failed'].includes(summary.vote) &&
      (method === 'Open' || method === 'Show of Hands') && row.notes === summary.notes;
  });
}
