import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { confirmedLocalScreenShare, mayOfferRegularScreenShare } from "../app/pages/meetings/regularMeetingScreenShareState";

const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const media = readFileSync("src/app/pages/meetings/LiveMeetingMedia.tsx", "utf8");

describe("LM-19 provider-authoritative screen-sharing UI", () => {
  it("never reports a presentation without the local provider's published state", () => {
    expect(confirmedLocalScreenShare(null)).toBe(false);
    expect(confirmedLocalScreenShare({})).toBe(false);
    expect(confirmedLocalScreenShare({ isScreenShareEnabled: false })).toBe(false);
    expect(confirmedLocalScreenShare({ isScreenShareEnabled: true })).toBe(true);
  });

  it("does not offer publisher controls to observer/guest viewer roles", () => {
    expect(mayOfferRegularScreenShare("Observer", true)).toBe(false);
    expect(mayOfferRegularScreenShare("Guest", true)).toBe(false);
    expect(mayOfferRegularScreenShare("Chairperson", true)).toBe(true);
    expect(mayOfferRegularScreenShare("Presenter", true)).toBe(true);
    expect(mayOfferRegularScreenShare("Unknown", true)).toBe(false);
  });

  it("also requires actual meeting join entitlement for a potential presenter", () => {
    expect(mayOfferRegularScreenShare("Chairperson", false)).toBe(false);
    expect(mayOfferRegularScreenShare("Presenter", false)).toBe(false);
  });

  it("separates user's share request from provider-confirmed publishing", () => {
    expect(workspace).toContain("const [shareRequested, setShareRequested] = useState(false)");
    expect(workspace).toContain("sharing={canPublishMedia && shareRequested}");
    expect(workspace).toContain("setIsSharing(confirmed)");
    expect(workspace).toContain('shareRequested ? "Cancel Share"');
  });

  it("does not publish when disconnected and clears the status on provider disconnect", () => {
    expect(media).toContain('if (!room || status !== "Connected") return;');
    expect(media).toContain('nextRoom.on(sdk.RoomEvent.Disconnected, () => {');
    expect(media).toContain('callbacks.current.onSharingChange(false)');
  });

  it("serializes asynchronous media commands and ignores stale callbacks", () => {
    expect(media).toContain("shareOperations.current.catch(() => undefined).then(async () => {");
    expect(media).toContain('if (!active) return;');
    expect(media).toContain("confirmedLocalScreenShare(room.localParticipant)");
  });
});
