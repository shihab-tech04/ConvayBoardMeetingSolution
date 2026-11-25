import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { LiveMeetingMedia } from "../app/pages/meetings/LiveMeetingMedia";
import { focusedLiveKitIdentity } from "../app/pages/meetings/liveMeetingLayout";
import { readFileSync } from "node:fs";

const audioTrack = {
  attach: vi.fn(() => {
    const node = document.createElement("audio");
    node.play = vi.fn(async () => undefined);
    return node;
  }),
  detach: vi.fn(() => undefined),
};
const local = {
  identity: "local", name: "Local Host", isLocal: true,
  isCameraEnabled: false, isMicrophoneEnabled: false,
  isScreenShareEnabled: false,
  videoTrackPublications: new Map(),
  audioTrackPublications: new Map(),
  setMicrophoneEnabled: vi.fn(async () => undefined),
  setCameraEnabled: vi.fn(async () => undefined),
  setScreenShareEnabled: vi.fn(async () => undefined),
};
const remote = {
  identity: "remote", name: "Remote Director", isLocal: false,
  isCameraEnabled: true, isMicrophoneEnabled: true,
  isScreenShareEnabled: false,
  videoTrackPublications: new Map(),
  audioTrackPublications: new Map([["audio", { source: "microphone", track: audioTrack }]]),
};
let room: FakeRoom;
class FakeRoom {
  localParticipant = local;
  remoteParticipants = new Map([["remote", remote]]);
  canPlaybackAudio = true;
  handlers = new Map<string, Function[]>();
  connect = vi.fn(async () => undefined);
  disconnect = vi.fn(async () => undefined);
  on(event: string, handler: Function) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
  }
  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
  }
  constructor() { room = this; }
}
const RoomEvent = Object.fromEntries([
  "AudioPlaybackStatusChanged", "ActiveSpeakersChanged", "TrackSubscribed",
  "TrackUnsubscribed", "TrackPublished", "TrackUnpublished", "ParticipantConnected",
  "ParticipantDisconnected", "TrackMuted", "TrackUnmuted", "LocalTrackPublished",
  "LocalTrackUnpublished", "Reconnecting", "Reconnected", "Disconnected",
].map(k => [k, k]));
const onPresence = vi.fn();
const admission = vi.fn(async () => ({ serverUrl: "wss://example.invalid", participantToken: "test-token" }));

function show(layout: "speaker" | "gallery") {
  return <LiveMeetingMedia meetingId="MTG-TEST" layout={layout} micOn={false} camOn={false} sharing={false}
    onMicChange={vi.fn()} onCamChange={vi.fn()} onSharingChange={vi.fn()}
    onPresence={onPresence} requestAdmission={admission} />;
}

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as { LivekitClient: unknown }).LivekitClient = { Room: FakeRoom, RoomEvent };
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { LivekitClient?: unknown }).LivekitClient;
});

describe("LM real provider Speaker/Gallery layout and stable audio", () => {
  it("focuses a real screen share, then active speaker, then visible remote camera", () => {
    expect(focusedLiveKitIdentity([], "remote")).toBeNull();
    expect(focusedLiveKitIdentity([local, remote], "local")).toBe("local");
    expect(focusedLiveKitIdentity([local, remote], "missing")).toBe("remote");
    expect(focusedLiveKitIdentity([{ ...local, isScreenShareEnabled: true }, remote], "remote")).toBe("local");
    expect(focusedLiveKitIdentity([local])).toBe("local");
  });

  it("changes the real connected room's visual layout without disconnecting or remounting audio", async () => {
    const view = render(show("speaker"));
    const speaker = await screen.findByRole("region", { name: "Live speaker layout" });
    expect(within(speaker).getAllByRole("article").length).toBe(2);
    await waitFor(() => expect(audioTrack.attach).toHaveBeenCalled());
    const attachesBeforeSwitch = audioTrack.attach.mock.calls.length;
    expect(room.connect).toHaveBeenCalledTimes(1);
    expect(within(speaker).getAllByRole("article")[0].getAttribute("aria-label")).toContain("Remote Director");

    view.rerender(show("gallery"));
    const gallery = await screen.findByRole("region", { name: "Live gallery layout" });
    expect(within(gallery).getAllByRole("article").length).toBe(2);
    expect(room.connect).toHaveBeenCalledTimes(1);
    expect(audioTrack.attach).toHaveBeenCalledTimes(attachesBeforeSwitch);

    view.rerender(show("speaker"));
    expect(await screen.findByRole("region", { name: "Live speaker layout" })).toBeTruthy();
    expect(audioTrack.attach).toHaveBeenCalledTimes(attachesBeforeSwitch);
  });

  it("responds to actual provider ActiveSpeakersChanged rather than random local avatar state", async () => {
    render(show("speaker"));
    await screen.findByRole("region", { name: "Live speaker layout" });
    act(() => { room.emit("ActiveSpeakersChanged", [local]); });
    const focused = within(screen.getByRole("region", { name: "Live speaker layout" })).getAllByRole("article")[0];
    expect(focused.getAttribute("aria-label")).toContain("Local Host");
  });

  it("uses the approved Speaker/Gallery control with the same mounted LiveKit media component", () => {
    const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    expect(workspace).toContain('layout={viewMode === "grid" ? "gallery" : "speaker"}');
    const media = readFileSync("src/app/pages/meetings/LiveMeetingMedia.tsx", "utf8");
    expect(media).toContain("RemoteAudioTracks");
    expect(media).toContain("room.remoteParticipants.values()");
    expect(media).toContain("ActiveSpeakersChanged");
  });
});
