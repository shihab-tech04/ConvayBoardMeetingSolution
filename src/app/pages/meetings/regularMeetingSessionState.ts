/**
 * LM-03 — a local guard on live-meeting control commands and a projection of
 * canonical server state. Neither function grants meeting access or replaces
 * the server's atomic transition, authorization, revision, or audit checks.
 */
export type LiveControlStatus =
  | "not-started" | "in-progress" | "paused" | "on-break" | "adjourned" | "ended";

export type LiveControlCommand = "in-progress" | "paused" | "on-break" | "adjourned";
export type CanonicalLiveStatus = "not_started" | "active" | "paused" | "ended";

/** A duplicate or stale client action must not trigger an unnecessary write. */
export function requestedLiveSessionStatus(
  canonical: CanonicalLiveStatus | string | undefined,
  command: LiveControlCommand,
): "active" | "paused" {
  if (canonical === "active" &&
      (command === "paused" || command === "on-break" || command === "adjourned")) {
    return "paused";
  }
  if (canonical === "paused" && command === "in-progress") return "active";
  throw new Error("The live session state has changed. Refresh before retrying this action.");
}

/**
 * The session registry is authoritative. The meeting's approved subtype only
 * distinguishes break/adjourned from ordinary paused state; browser-local
 * snapshots must not make an ended session active again.
 */
export function canonicalLiveControlStatus(
  canonical: CanonicalLiveStatus | string | undefined,
  meetingApproval: string | undefined,
): LiveControlStatus | null {
  switch (canonical) {
    case "not_started": return "not-started";
    case "active": return "in-progress";
    case "ended": return "ended";
    case "paused":
      if (meetingApproval === "On Break") return "on-break";
      if (meetingApproval === "Adjourned") return "adjourned";
      return "paused";
    default: return null;
  }
}

/** Changes in server-backed status or source meeting must reconcile again. */
export function canonicalLiveStatusKey(
  meetingId: string,
  sessionId: string,
  canonical: string | undefined,
  meetingApproval: string | undefined,
): string {
  return JSON.stringify([meetingId, sessionId, canonical ?? null, meetingApproval ?? null]);
}
