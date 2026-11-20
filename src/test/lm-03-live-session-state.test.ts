import { describe, expect, it } from "vitest";
import {
  canonicalLiveControlStatus,
  canonicalLiveStatusKey,
  requestedLiveSessionStatus,
} from "../app/pages/meetings/regularMeetingSessionState";

describe("LM-03 canonical live-session transitions", () => {
  it("pauses, breaks and adjourns the existing active session, never creates a second one", () => {
    for (const command of ["paused", "on-break", "adjourned"] as const) {
      expect(requestedLiveSessionStatus("active", command)).toBe("paused");
    }
  });

  it("resumes only a server-paused session", () => {
    expect(requestedLiveSessionStatus("paused", "in-progress")).toBe("active");
    expect(() => requestedLiveSessionStatus("active", "in-progress")).toThrow(/changed/);
  });

  it("denies a second pause and any unrelated command while paused", () => {
    for (const command of ["paused", "on-break", "adjourned"] as const) {
      expect(() => requestedLiveSessionStatus("paused", command)).toThrow(/Refresh/);
    }
  });

  it("denies control before start and after terminal closure", () => {
    for (const status of ["not_started", "ended", undefined, "invalid"]) {
      expect(() => requestedLiveSessionStatus(status, "paused")).toThrow();
      expect(() => requestedLiveSessionStatus(status, "in-progress")).toThrow();
    }
  });

  it("projects authoritative pause subtypes without promoting local browser state", () => {
    expect(canonicalLiveControlStatus("not_started", "Scheduled")).toBe("not-started");
    expect(canonicalLiveControlStatus("active", "In Progress")).toBe("in-progress");
    expect(canonicalLiveControlStatus("paused", "Paused")).toBe("paused");
    expect(canonicalLiveControlStatus("paused", "On Break")).toBe("on-break");
    expect(canonicalLiveControlStatus("paused", "Adjourned")).toBe("adjourned");
    expect(canonicalLiveControlStatus("ended", "In Progress")).toBe("ended");
    expect(canonicalLiveControlStatus("garbled", "In Progress")).toBeNull();
  });

  it("reconciles after a second client changes status or the selected meeting changes", () => {
    const active = canonicalLiveStatusKey("m1", "session1", "active", "In Progress");
    expect(active).not.toBe(canonicalLiveStatusKey("m1", "session1", "paused", "Paused"));
    expect(active).not.toBe(canonicalLiveStatusKey("m1", "session2", "active", "In Progress"));
    expect(active).not.toBe(canonicalLiveStatusKey("m2", "session1", "active", "In Progress"));
    expect(active).toBe(canonicalLiveStatusKey("m1", "session1", "active", "In Progress"));
  });
});
