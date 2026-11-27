import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RegularAttendanceTransitionQueue, acceptsVerifiedAttendanceRevision, ScopedAttendanceReadbackGate } from "../app/pages/meetings/regularMeetingAttendanceQueue";
import { OnlinePresenceTransition } from "../app/pages/meetings/onlinePresenceTransition";

describe("WS2 LM-26 real-media attendance transition ordering", () => {
  it("persists Left after an in-flight Present instead of discarding departure", async () => {
    const queue = new RegularAttendanceTransitionQueue();
    const events: string[] = [];
    let finishPresent!: () => void;
    const presentAck = new Promise<void>(resolve => { finishPresent = resolve; });
    const present = queue.enqueue("member-1", async () => {
      events.push("Present started");
      await presentAck;
      events.push("Present committed");
    });
    const leave = queue.enqueue("member-1", async () => {
      events.push("Left committed");
    });
    await Promise.resolve();
    expect(events).toEqual(["Present started"]);
    finishPresent();
    await Promise.all([present, leave]);
    expect(events).toEqual(["Present started", "Present committed", "Left committed"]);
  });

  it("does not lose Left following a failed/timed-out Present request", async () => {
    const queue = new RegularAttendanceTransitionQueue();
    const states: string[] = [];
    const present = queue.enqueue("chair-1", async () => {
      throw new Error("LiveKit admission timed out");
    });
    const left = queue.enqueue("chair-1", async () => { states.push("Left"); });
    await expect(present).rejects.toThrow("timed out");
    await expect(left).resolves.toBeUndefined();
    expect(states).toEqual(["Left"]);
  });

  it("does not block other participants while one actor awaits readback", async () => {
    const queue = new RegularAttendanceTransitionQueue();
    let finishChair!: () => void;
    const blocked = new Promise<void>(resolve => { finishChair = resolve; });
    const chair = queue.enqueue("chair", async () => { await blocked; });
    let observerCommitted = false;
    await queue.enqueue("observer", async () => { observerCommitted = true; });
    expect(observerCommitted).toBe(true);
    finishChair();
    await chair;
  });

  it("preserves join, disconnect, reconnect and explicit Leave in provider order", async () => {
    const presence = new OnlinePresenceTransition();
    const queue = new RegularAttendanceTransitionQueue();
    const persisted: string[] = [];
    for (const event of [presence.onPresence(true), presence.onPresence(false),
      presence.onPresence(true), presence.onLeaveConfirmed(true), presence.onPresence(false)]) {
      if (event) void queue.enqueue("secretary", async () => { persisted.push(event); });
    }
    // Sentinel is queued after the last attendance update for this participant.
    await queue.enqueue("secretary", async () => undefined);
    expect(persisted).toEqual(["Present", "Left", "Present", "Left"]);
  });

  it("rejects stale, cross-meeting or invalid quorum readback after newer SQL confirmation", () => {
    expect(acceptsVerifiedAttendanceRevision("meeting-A", 9, "meeting-A", 10)).toBe(false);
    expect(acceptsVerifiedAttendanceRevision("meeting-B", 12, "meeting-A", 10)).toBe(false);
    expect(acceptsVerifiedAttendanceRevision("meeting-A", -1, "meeting-A", 0)).toBe(false);
    expect(acceptsVerifiedAttendanceRevision("meeting-A", 11, "meeting-A", 10)).toBe(true);
    expect(acceptsVerifiedAttendanceRevision("meeting-A", 11, "meeting-A", 11)).toBe(true);
  });

  it("workspace queues durable transitions; no in-flight attendance suppression", () => {
    const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    expect(source).toContain("attendanceQueue.enqueue(id, async () =>");
    expect(source).not.toContain("pendingAttendance.current.has(id)");
  });
});


describe("LM-07/09/26 scoped attendance view freshness", () => {
  it("rejects old account and reopened-session tickets even when the meeting ID matches", () => {
    const first = new ScopedAttendanceReadbackGate("meeting-A", "session-A", "user-A");
    const stale = first.begin();
    const otherUser = new ScopedAttendanceReadbackGate("meeting-A", "session-A", "user-B");
    const reopened = new ScopedAttendanceReadbackGate("meeting-A", "session-B", "user-A");
    const returned = new ScopedAttendanceReadbackGate("meeting-A", "session-A", "user-A");
    for (const gate of [otherUser, reopened, returned]) {
      gate.begin();
      expect(gate.accept(stale, "meeting-A", 99)).toBe(false);
      expect(gate.reject(stale)).toBe(false);
    }
  });
  it("rejects stale errors and successes after a newer valid readback", () => {
    const gate = new ScopedAttendanceReadbackGate("meeting-A", "session-A", "user-A");
    const older = gate.begin();
    const newer = gate.begin();
    expect(gate.accept(newer, "meeting-A", 10)).toBe(true);
    expect(gate.reject(older)).toBe(false);
    expect(gate.accept(older, "meeting-A", 11)).toBe(false);
  });
  it("invalidates on current failure and permits only a fresh non-regressing recovery", () => {
    const gate = new ScopedAttendanceReadbackGate("meeting-A", "session-A", "user-A");
    expect(gate.accept(gate.begin(), "meeting-A", 10)).toBe(true);
    const delayed = gate.begin();
    expect(gate.reject(gate.begin())).toBe(true);
    expect(gate.accept(delayed, "meeting-A", 10)).toBe(false);
    expect(gate.accept(gate.begin(), "meeting-A", 9)).toBe(false);
    expect(gate.accept(gate.begin(), "meeting-A", 10)).toBe(true);
  });
  it("never exposes retired tagged state or starts a queued transition after a scope change", () => {
    const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    expect(source).toContain("onlineAttendance?.gate === attendanceGate");
    expect(source).toContain("if (activeAttendanceGate.current !== gate) return;");
    expect(source).toContain("if (activeAttendanceGate.current === attendanceGate) activeAttendanceGate.current = null;");
    expect(source).toContain("isOnlineMeeting ? EMPTY_ATTENDANCE : attendanceMap");
    expect(source).toContain("invalidateVerifiedAttendance(recovery)");
  });
});
