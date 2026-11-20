/**
 * RP-01 — Historical quorum KPIs must use recorded bms.quorum evidence,
 * never a meeting's planning-time quorum_forecast.
 * No quorum event / ambiguous chronology / malformed evidence is UNVERIFIED.
 */
export type RecordedQuorumStatus = "Met" | "Not Met" | "Unverified";

export interface RecordedQuorumEvidence {
  meeting_id: string;
  quorum_met: string;
  recorded_at?: string;
  created_at?: string;
}

export function normalizeRecordedQuorum(value: unknown): RecordedQuorumStatus {
  if (typeof value !== "string") return "Unverified";
  switch (value.trim().toLowerCase()) {
    case "yes":
    case "met": return "Met";
    case "no":
    case "not met": return "Not Met";
    default: return "Unverified";
  }
}

function eventTime(event: RecordedQuorumEvidence): number | null {
  const recorded = Date.parse(event.recorded_at ?? "");
  if (Number.isFinite(recorded)) return recorded;
  const created = Date.parse(event.created_at ?? "");
  return Number.isFinite(created) ? created : null;
}

export function latestRecordedQuorumStatus(
  meetingId: unknown,
  events: readonly RecordedQuorumEvidence[],
): RecordedQuorumStatus {
  const id = typeof meetingId === "string" ? meetingId.trim() : "";
  if (!id) return "Unverified";
  const related = events.filter(event => event.meeting_id === id);
  if (related.length === 0) return "Unverified";
  if (related.length === 1) return normalizeRecordedQuorum(related[0].quorum_met);

  // Multiple records require enough chronology to establish the last recorded
  // quorum statement, otherwise a stale "Met" event would inflate the KPI.
  const timed = related.map(event => ({ at: eventTime(event), status: normalizeRecordedQuorum(event.quorum_met) }));
  if (timed.some(event => event.at === null)) return "Unverified";
  const latestTime = Math.max(...timed.map(event => event.at as number));
  const latest = timed.filter(event => event.at === latestTime).map(event => event.status);
  return latest.length > 0 && latest.every(status => status === latest[0]) ? latest[0] : "Unverified";
}
