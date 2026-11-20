import { describe, expect, it } from "vitest";
import { OnlinePresenceTransition } from "../app/pages/meetings/onlinePresenceTransition";
import { readFileSync } from "node:fs";

const workspace = readFileSync(new URL("../app/pages/meetings/LiveMeetingWorkspace.tsx", import.meta.url), "utf8");
const media = readFileSync(new URL("../app/pages/meetings/LiveMeetingMedia.tsx", import.meta.url), "utf8");

describe("LM-26 online presence and leave transition", () => {
  it("never turns a denied/failed admission into recorded attendance", () => {
    const gate = new OnlinePresenceTransition();
    expect(gate.onPresence(false)).toBeNull();
    expect(gate.onLeaveConfirmed(false)).toBeNull();
    expect(gate.onPresence(true)).toBeNull();
  });
  it("deduplicates connected and repeated room teardown callbacks", () => {
    const gate = new OnlinePresenceTransition();
    expect(gate.onPresence(true)).toBe("Present");
    expect(gate.onPresence(true)).toBeNull();
    expect(gate.onPresence(false)).toBe("Left");
    expect(gate.onPresence(false)).toBeNull();
    expect(gate.onLeaveConfirmed(true)).toBeNull();
  });
  it("records confirmed online Leave only once before media unmount", () => {
    const gate = new OnlinePresenceTransition();
    expect(gate.onPresence(true)).toBe("Present");
    expect(gate.onLeaveConfirmed(true)).toBe("Left");
    expect(gate.onLeaveConfirmed(true)).toBeNull();
    expect(gate.onPresence(false)).toBeNull();
    expect(gate.onPresence(true)).toBeNull();
  });
  it("clears stale Present state once if online media never established a room", () => {
    const gate = new OnlinePresenceTransition();
    expect(gate.onLeaveConfirmed(true)).toBe("Left");
    expect(gate.onPresence(false)).toBeNull();
  });
  it("allows fresh attendance following a disconnect and later reconnection", () => {
    const gate = new OnlinePresenceTransition();
    expect(gate.onPresence(true)).toBe("Present");
    expect(gate.onPresence(false)).toBe("Left");
    expect(gate.onPresence(true)).toBe("Present");
    expect(gate.onPresence(true)).toBeNull();
    expect(gate.onLeaveConfirmed(true)).toBe("Left");
  });
  it("does not change attendance on a cancelled leave confirmation", () => {
    const gate = new OnlinePresenceTransition();
    expect(gate.onPresence(true)).toBe("Present");
    // Cancel closes the modal without invoking onLeaveConfirmed.
    expect(gate.onPresence(true)).toBeNull();
    expect(gate.onPresence(false)).toBe("Left");
  });
  it("keeps explicit physical leave and gates online callbacks to linked actors", () => {
    const block = workspace.slice(workspace.indexOf('{leaveConfirmOpen && (() => {'), workspace.indexOf('{/* Reopen vote modal */}'));
    expect(block).toContain('} else if (wasPresent) {');
    expect(block).toContain('setAttendance(myParticipantId, "Left");');
    expect(block).toContain('onlinePresence.onLeaveConfirmed(wasPresent)');
    expect(workspace).toContain('if (!myLink) return;');
    expect(workspace).toContain('onlinePresence.onPresence(connected)');
    expect(media).toContain('callbacks.current.onPresence(true, nextRoom?.localParticipant?.identity)');
  });
});
