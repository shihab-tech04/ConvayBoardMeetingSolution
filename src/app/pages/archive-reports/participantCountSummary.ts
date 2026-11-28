/** Summarize stored participant counts without treating missing or malformed values as zero. */
export function summarizeParticipantCounts(counts: readonly unknown[]): {
  totalParticipants: number | null;
  avgParticipants: number | null;
} {
  let total = 0;
  for (const value of counts) {
    const count = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(total + count)) {
      return { totalParticipants: null, avgParticipants: null };
    }
    total += count;
  }
  return { totalParticipants: total, avgParticipants: counts.length ? Math.round(total / counts.length) : 0 };
}
