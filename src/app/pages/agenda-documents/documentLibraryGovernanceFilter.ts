/** Document Library display filtering only; never substitutes for SQL/RLS authorization. */
export interface GovernanceMeeting {
  meeting_id: string;
  governance_body?: string;
  committee?: string;
}

/** Match a selected governance body through the document's linked meeting.
 * Reject ambiguous/unresolved meeting references instead of showing unrelated documents.
 */
export function matchesDocumentGovernanceBody(
  relatedMeeting: unknown,
  selectedBody: string,
  meetings: readonly GovernanceMeeting[],
): boolean {
  if (!selectedBody || selectedBody === "All Committees") return true;
  if (typeof relatedMeeting !== "string" || !relatedMeeting.trim()) return false;
  const reference = relatedMeeting.trim();
  const meeting = meetings.find(item =>
    typeof item.meeting_id === "string" &&
    item.meeting_id.trim() !== "" &&
    (reference === item.meeting_id || reference.startsWith(item.meeting_id + " — ")),
  );
  if (!meeting) return false;
  // Preserve existing Meeting.governance_body canonical override and legacy committee.
  return (meeting.governance_body?.trim() || meeting.committee?.trim() || "") === selectedBody;
}
