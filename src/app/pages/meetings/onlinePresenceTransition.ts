/**
 * LM-26: deduplicate client-side online presence notifications for one
 * authenticated actor and meeting workspace lifetime.
 *
 * This deliberately does NOT establish authoritative attendance or quorum.
 * The server must validate and acknowledge every durable transition, including
 * cross-tab idempotency, admission, actor/tenant scope and revision ordering.
 */
export type OnlineAttendanceTransition = "Present" | "Left";

export class OnlinePresenceTransition {
  private phase: "not-connected" | "present" | "left" = "not-connected";
  private leaveConfirmed = false;

  /** Emit only changes confirmed by a connected LiveKit room. */
  onPresence(connected: boolean): OnlineAttendanceTransition | null {
    if (this.leaveConfirmed) return null;
    if (connected) {
      if (this.phase === "present") return null;
      this.phase = "present";
      return "Present";
    }
    if (this.phase !== "present") return null;
    this.phase = "left";
    return "Left";
  }

  /**
   * Confirmed explicit Leave owns the transition before media teardown.
   * If the session never connected but stale state says Present, clear it once.
   * A previously signaled disconnect has already emitted Left and is not
   * repeated by the confirmation or cleanup callbacks.
   */
  onLeaveConfirmed(wasPresent: boolean): OnlineAttendanceTransition | null {
    if (this.leaveConfirmed) return null;
    this.leaveConfirmed = true;
    if (this.phase === "present" || (this.phase === "not-connected" && wasPresent)) {
      this.phase = "left";
      return "Left";
    }
    return null;
  }
}
