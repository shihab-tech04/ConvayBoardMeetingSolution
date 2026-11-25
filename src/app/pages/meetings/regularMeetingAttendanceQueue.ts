/**
 * LM-26 / WS2: serialize SQL attendance transitions for one meeting actor.
 *
 * LiveKit can emit Present and Left before the first server acknowledgement.
 * Dropping the second status leaves a departed attendee marked Present in
 * durable SQL/quorum. Process every confirmed transition in order instead.
 *
 * The queue does NOT validate identity or grant attendance rights. Each task
 * must still use the authenticated Edge/SQL command and verified readback.
 */
export class RegularAttendanceTransitionQueue {
  private pending = new Map<string, Promise<unknown>>();

  enqueue<T>(participantId: string, transition: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(participantId) ?? Promise.resolve();
    // A failed Present must not suppress a later confirmed Left or rejoin.
    const current = previous.then(transition, transition);
    this.pending.set(participantId, current);
    void current.finally(() => {
      if (this.pending.get(participantId) === current) this.pending.delete(participantId);
    }).catch(() => undefined);
    return current;
  }
}

/**
 * A slower poll response must never roll back a newer committed SQL quorum
 * revision or display another meeting's attendance after route switching.
 */
export function acceptsVerifiedAttendanceRevision(
  responseMeetingId: string,
  quorumRevision: number,
  activeMeetingId: string,
  lastAppliedRevision: number,
): boolean {
  return responseMeetingId === activeMeetingId
    && Number.isSafeInteger(quorumRevision)
    && quorumRevision >= 0
    && quorumRevision >= lastAppliedRevision;
}

/** A request belongs to one mounted, authenticated meeting/session view. */
export interface AttendanceReadbackTicket {
  readonly scope: ScopedAttendanceReadbackGate;
  readonly sequence: number;
}

/**
 * Prevent delayed reads/errors from a retired account/session scope or an older
 * request from republishing a stale attendance/quorum view. This is a client
 * freshness guard only; the SQL/Edge session authorization is still mandatory.
 */
export class ScopedAttendanceReadbackGate {
  private sequence = 0;
  private settled = 0;
  private revision = -1;
  constructor(readonly meetingId: string, readonly sessionId: string, readonly actorId: string) {}

  begin(): AttendanceReadbackTicket {
    return { scope: this, sequence: ++this.sequence };
  }

  private pending(ticket: AttendanceReadbackTicket): boolean {
    return ticket.scope === this && Number.isSafeInteger(ticket.sequence)
      && ticket.sequence > this.settled && ticket.sequence <= this.sequence;
  }

  accept(ticket: AttendanceReadbackTicket, responseMeetingId: string, quorumRevision: number): boolean {
    if (!this.pending(ticket) || !acceptsVerifiedAttendanceRevision(
      responseMeetingId, quorumRevision, this.meetingId, this.revision,
    )) return false;
    this.settled = ticket.sequence;
    this.revision = quorumRevision;
    return true;
  }

  reject(ticket: AttendanceReadbackTicket): boolean {
    if (!this.pending(ticket)) return false;
    this.settled = ticket.sequence;
    return true;
  }
}
