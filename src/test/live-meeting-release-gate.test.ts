import { describe, expect, it } from "vitest";
import { isLiveMeetingReleaseApproved } from "../app/services/liveMeetingReleaseGate";

describe("live-meeting production release gate", () => {
  it("does not activate missing backend routes by default or for ambiguous values", () => {
    for (const value of [undefined, null, false, true, "", "false", "TRUE", "1", "yes", 1, {}]) {
      expect(isLiveMeetingReleaseApproved(value)).toBe(false);
    }
  });
  it("requires an explicit exact opt-in", () => {
    expect(isLiveMeetingReleaseApproved("true")).toBe(true);
  });
});

import { readFileSync } from "node:fs";

const gateSource = readFileSync("src/app/services/liveMeetingReleaseGate.ts", "utf8");
const routerSource = readFileSync("src/app/routes.tsx", "utf8");
const navigationSource = readFileSync("src/app/data/navigation.ts", "utf8");
const workspaceSource = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");

describe("independent regular and Quick Meeting release boundaries", () => {
  it("does not expose Quick Meeting when only regular online meetings are enabled", () => {
    expect(gateSource).toContain("VITE_CONVAY_REGULAR_LIVE_ENABLED");
    expect(gateSource).toContain("VITE_CONVAY_QUICK_MEETING_ENABLED");
    expect(gateSource).not.toContain("VITE_CONVAY_LIVEKIT_ENABLED");
    expect(routerSource).toContain("QUICK_MEETINGS_RELEASED ? [");
    expect(routerSource).not.toContain("LIVE_MEETINGS_RELEASED ? [");
    expect(navigationSource).toContain("QUICK_MEETINGS_RELEASED ? [");
  });
  it("preserves physical-meeting media controls regardless of regular online release", () => {
    expect(workspaceSource).not.toContain("(!LIVE_MEETINGS_RELEASED || isOnlineMeeting)");
    expect(workspaceSource).not.toContain("!LIVE_MEETINGS_RELEASED && !isSharing");
    expect(workspaceSource).toContain('else { setIsSharing(v => !v); if (!isSharing) setViewMode("document"); }');
  });
  it("never promotes online readiness check-ins to attendee presence before SQL readback", () => {
    expect(workspaceSource).toContain("if (!isOnlineMeeting) setAttendanceMap(prev => {");
    expect(workspaceSource).toContain("const saved = await commitLiveAttendance(meetingId, id, status, mode);");
    expect(workspaceSource).toContain("serverQuorum?.met === true");
  });
});
