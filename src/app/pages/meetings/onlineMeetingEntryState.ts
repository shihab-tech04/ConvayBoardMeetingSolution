/**
 * Regular LiveKit room entry is derived ONLY from canonical SQL meeting and
 * session records. Browser-local control snapshots are display drafts, never
 * authority to start, resume, or admit participants.
 *
 * The SQL Edge issuer remains the final authority for every admission.
 */
export interface CanonicalOnlineSession {
  session_status?: string | null;
}

export interface CanonicalOnlineRoomEntry {
  canJoin: boolean;
  mayAttemptStart: boolean;
  reason: string | undefined;
}

const STARTABLE = new Set([
  "draft", "pending approval", "approved", "scheduled", "rescheduled",
  "published", "ready to start",
]);
const JOINABLE = new Set(["in progress", "paused", "on break", "adjourned"]);
const TERMINAL = new Set([
  "cancelled", "canceled", "rejected", "completed", "ended", "archived",
  "awaiting minutes", "minutes approved",
]);
const ACTIVE_SESSION = new Set(["active", "paused"]);

export function resolveCanonicalOnlineRoomEntry(
  approvalStatus: string | undefined,
  sessions: readonly CanonicalOnlineSession[],
): CanonicalOnlineRoomEntry {
  const status = String(approvalStatus ?? "").trim().toLowerCase();
  if (!status) return {
    canJoin: false, mayAttemptStart: false,
    reason: "Meeting status is loading. Refresh if it does not appear.",
  };
  if (TERMINAL.has(status)) return {
    canJoin: false, mayAttemptStart: false,
    reason: "This meeting is closed and cannot be joined or restarted.",
  };
  const active = sessions.filter(session => ACTIVE_SESSION.has(
    String(session.session_status ?? "").trim().toLowerCase(),
  ));
  if (active.length > 1) return {
    canJoin: false, mayAttemptStart: false,
    reason: "Multiple active sessions were found. Contact the organizer to reconcile them.",
  };
  if (active.length === 1 && JOINABLE.has(status)) return {
    canJoin: true, mayAttemptStart: false, reason: undefined,
  };
  if (sessions.length === 0 && STARTABLE.has(status)) return {
    canJoin: false, mayAttemptStart: true,
    reason: "Waiting for an authorized host to start this LiveKit meeting. This page checks automatically.",
  };
  return {
    canJoin: false, mayAttemptStart: false,
    reason: "Meeting and room status do not agree. Refresh or contact the organizer; no new session will be created automatically.",
  };
}
