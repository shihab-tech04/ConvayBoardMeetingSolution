import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RegularAttendanceTransitionQueue } from "../app/pages/meetings/regularMeetingAttendanceQueue";
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

  it("workspace queues durable transitions; no in-flight attendance suppression", () => {
    const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    expect(source).toContain("attendanceQueue.enqueue(id, async () =>");
    expect(source).not.toContain("pendingAttendance.current.has(id)");
  });
});
