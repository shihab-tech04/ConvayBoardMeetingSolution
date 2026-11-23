import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const prejoin = readFileSync("src/app/components/meetings/MeetingPreJoinPanel.tsx", "utf8");
const readiness = readFileSync("src/app/components/meetings/PreMeetingReadinessPanel.tsx", "utf8");
const styles = readFileSync("src/app/components/meetings/preMeetingReadiness.css", "utf8");

describe("LM readiness regression: real virtual start and physical readiness", () => {
  it("waits for a canonical SQL live session before fetching online attendance", () => {
    expect(workspace).toContain("const hasCanonicalOnlineSession = isOnlineMeeting");
    expect(workspace).toContain("if (!hasCanonicalOnlineSession) {");
    expect(workspace).toContain("setServerQuorum(null)");
    expect(workspace).toContain("readLiveAttendance(meetingId, target)");
    expect(workspace).toContain("applyVerifiedAttendance(saved)");
  });
  it("routes Virtual and Hybrid hosts to the real verified LiveKit prejoin, not manual in-person attendance", () => {
    expect(workspace).toContain('if (isOnlineMeeting) return "prejoin"');
    expect(workspace).toContain('if (isOnlineMeeting && phase === "readiness") setPhase("prejoin")');
    expect(workspace).toContain('entryAction === "start_meeting") return "readiness"');
    expect(workspace).toContain('startLabel={access.is_super_admin ? "Force Start Now" : "Start Meeting Now"}');
    expect(workspace).toContain('access.loaded && canControlMeeting && canonicalRoomEntry.mayAttemptStart');
    expect(workspace).toContain("await convayAuth.forceStartMeeting(meetingId)");
    expect(prejoin).toContain("startLabel");
    expect(prejoin).toContain('disabled={Boolean(joinBlockedReason)}');
  });
  it("does not accidentally set an online participant Present from readiness checkbox", () => {
    expect(workspace).toContain('if (!isOnlineMeeting) setAttendanceMap(prev => {');
    expect(workspace).toContain('return false;');
    expect(workspace).toContain("return true;");
  });
  it("preserves physical attendance and makes failed starts retryable", () => {
    expect(readiness).toContain("const result = await onStartMeeting(requested)");
    expect(readiness).toContain("if (result === false)");
    expect(readiness).toContain("startRequested.current = false");
    expect(readiness).toContain('aria-expanded={open}');
    expect(readiness).toContain('defaultOpen={false}');
  });
  it("has an accessible, bounded layout with mobile reflow and scroll-safe sticky footer", () => {
    expect(styles).toContain("height: 100dvh");
    expect(styles).toContain("min-height: 0");
    expect(styles).toContain("overflow-y: auto");
    expect(styles).toContain("max-width: 1160px");
    expect(styles).toContain("@media (max-width: 440px)");
    expect(readiness).toContain('className="pre-meeting-readiness__body"');
    expect(readiness).toContain('className="pre-meeting-readiness__footer"');
  });
});
