/**
 * WS-C MN-09/MN-13: fail-closed preflight for the Meeting Record detail tab.
 *
 * UI-only checks, not authorization. The future trusted MN-01 SQL guard must
 * independently validate actor, meeting, current status and immutable history.
 * Keep the same lifecycle stages as minutesSourceIntegrity.ts in PR #80.
 */
const REVIEW_STAGES = new Set([
  "Under Secretary Review",
  "Under Chairperson Review",
  "Member Review",
]);
const EDITABLE_STAGES = new Set(["Draft", "Revision Requested"]);

export function canSignMinutes(status: unknown, permitted: boolean): boolean {
  return permitted && status === "Approved";
}

export function canRequestMinutesRevision(status: unknown, permitted: boolean): boolean {
  return permitted && typeof status === "string" && REVIEW_STAGES.has(status);
}

export function canEditMinutesContent(status: unknown, permitted: boolean): boolean {
  return permitted && typeof status === "string" && EDITABLE_STAGES.has(status);
}

export function canArchiveMinutes(status: unknown, permitted: boolean): boolean {
  return permitted && status === "Signed";
}

export function buildMinutesRevisionRequest(
  status: unknown,
  permitted: boolean,
  instructions: unknown,
): { approval_status: "Revision Requested"; revision_instructions: string } {
  if (!canRequestMinutesRevision(status, permitted)) {
    throw new Error("A revision may only be requested by an authorized reviewer during minutes review.");
  }
  const reason = typeof instructions === "string" ? instructions.trim() : "";
  if (reason.length < 10) {
    throw new Error("Provide revision instructions of at least 10 characters.");
  }
  return { approval_status: "Revision Requested", revision_instructions: reason };
}
