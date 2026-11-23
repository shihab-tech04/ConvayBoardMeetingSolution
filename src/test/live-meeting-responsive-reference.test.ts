import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// This contract protects the approved desktop layout and the owner-supplied
// mobile adaptation without replacing the current LiveKit/SQL meeting engine.
const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const css = readFileSync("src/styles/live-meeting-responsive.css", "utf8");

describe("Live Meeting responsive reference adaptation", () => {
  it("keeps the current production meeting, LiveKit and quorum contracts", () => {
    expect(source).toContain("convayAuth.forceStartMeeting(meetingId)");
    expect(source).toContain("buildMeetingStartBatch(");
    expect(source).toContain("LiveMeetingMedia meetingId={meetingId}");
    expect(source).toContain("commitVerifiedMinutesCapture(");
    expect(source).toContain("serverQuorum");
    expect(source).toContain("canPublishMedia && myMicOn");
  });

  it("loads a scoped responsive stylesheet without altering other product screens", () => {
    expect(source).toContain('import "../../../styles/live-meeting-responsive.css"');
    expect(css).toContain(".convay-live-root");
    expect(css).not.toMatch(/(^|\n)\s*(body|html|button|input)\s*\{/);
    expect(source).toContain('className="convay-live-root"');
  });

  it("defaults mobile board controls to closed and restores them on viewport change", () => {
    expect(source).toContain('window.matchMedia("(max-width: 767px)")');
    expect(source).toContain('typeof window.matchMedia !== "function"');
    expect(source).toContain('query.addEventListener("change", onViewportChange)');
    expect(source).toContain('aria-expanded={panelOpen}');
    expect(source).toContain('aria-label="Close board controls"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('event.stopImmediatePropagation()');
    expect(source).toContain('closeOnEscape, { capture: true }');
  });

  it("supports small phones, mobile safe areas, tablets and large desktop screens", () => {
    for (const width of [767, 380, 1199, 1600]) {
      expect(css).toContain(width + "px");
    }
    expect(css).toContain("100dvh");
    expect(css).toContain("safe-area-inset-top");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain(".convay-live-gallery");
    expect(css).toContain(".convay-live-media-gallery");
    expect(css).toContain(".convay-live-document-split");
  });

  it("has an accessible mobile board panel, scrollable controls and visible Leave action", () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab" aria-selected={panelTab === tab.id}');
    expect(source).toContain('className="convay-live-sidebar"');
    expect(source).toContain('className="convay-live-dock"');
    expect(source).toContain('className="convay-live-leave"');
    expect(css).toContain(".convay-live-sidebar-tabs");
    expect(css).toContain("touch-action: pan-x");
    expect(css).toContain("position: absolute !important");
    expect(css).toContain("overscroll-behavior");
  });

  it("keeps chat and reactions reachable on mobile instead of fixed desktop geometry", () => {
    expect(source).toContain('className="convay-live-chat"');
    expect(source).toContain('className="convay-live-reactions"');
    expect(css).toContain("height: min(55dvh, 420px)");
    expect(css).toContain("width: 100% !important");
  });
});
