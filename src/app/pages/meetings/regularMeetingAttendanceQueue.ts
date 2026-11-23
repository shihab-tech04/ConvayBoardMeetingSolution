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
    const current = previous.catch(() => undefined).then(transition);
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
