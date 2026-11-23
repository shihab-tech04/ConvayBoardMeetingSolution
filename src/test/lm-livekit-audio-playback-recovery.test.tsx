import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LiveMeetingMedia } from "../app/pages/meetings/LiveMeetingMedia";

// A deterministic in-memory provider facade is used ONLY to exercise browser UI
// and event handling. It does not claim that a real WebRTC call was completed.
let room: MockRoom;
let allowAudioImmediately = false;
let rejectAudio = false;

class MockRoom {
  localParticipant = {
    identity: "test-user",
    name: "Tester",
    videoTrackPublications: new Map(),
    audioTrackPublications: new Map(),
    isCameraEnabled: false,
    isMicrophoneEnabled: false,
    isScreenShareEnabled: false,
    setMicrophoneEnabled: vi.fn(async () => undefined),
    setCameraEnabled: vi.fn(async () => undefined),
    setScreenShareEnabled: vi.fn(async () => undefined),
  };
  remoteParticipants = new Map();
  canPlaybackAudio = allowAudioImmediately;
  handlers = new Map<string, Array<() => void>>();
  connect = vi.fn(async () => undefined);
  disconnect = vi.fn(async () => undefined);
  on(event: string, fn: () => void) {
    const current = this.handlers.get(event) ?? [];
    current.push(fn);
    this.handlers.set(event, current);
    return this;
  }
  emit(event: string) { for (const handler of this.handlers.get(event) ?? []) handler(); }
  startAudio = vi.fn(async () => {
    if (rejectAudio) throw new Error("Browser permission required");
    this.canPlaybackAudio = true;
    this.emit("audioPlaybackChanged");
  });
  constructor() { room = this; }
}

const sdk = {
  Room: MockRoom,
  RoomEvent: Object.fromEntries([
    "AudioPlaybackStatusChanged", "TrackSubscribed", "TrackUnsubscribed",
    "TrackPublished", "TrackUnpublished", "ParticipantConnected",
    "ParticipantDisconnected", "TrackMuted", "TrackUnmuted",
    "LocalTrackPublished", "LocalTrackUnpublished", "Reconnecting",
    "Reconnected", "Disconnected",
  ].map(k => [k, k === "AudioPlaybackStatusChanged" ? "audioPlaybackChanged" : k])),
};

function renderMedia() {
  return render(<LiveMeetingMedia meetingId="MTG-TEST"
    micOn={false} camOn={false} sharing={false}
    onMicChange={vi.fn()} onCamChange={vi.fn()} onSharingChange={vi.fn()}
    onPresence={vi.fn()}
    requestAdmission={async () => ({serverUrl: "wss://test.invalid", participantToken: "test-provider-token"})}
  />);
}

beforeEach(() => {
  allowAudioImmediately = false;
  rejectAudio = false;
  (window as unknown as { LivekitClient: unknown }).LivekitClient = sdk;
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { LivekitClient?: unknown }).LivekitClient;
});

describe("LiveKit incoming audio browser-autoplay recovery", () => {
  it("shows Enable Audio only after authenticated provider room connection reports blocked playback", async () => {
    renderMedia();
    const action = await screen.findByRole("button", { name: "Enable incoming meeting audio" });
    expect(room.connect).toHaveBeenCalled();
    expect(screen.getByText(/incoming meeting audio is blocked/i)).toBeTruthy();
    fireEvent.click(action);
    await waitFor(() => expect(room.startAudio).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Enable incoming meeting audio" })).toBeNull());
  });

  it("never displays unblock when LiveKit reports audio playback already permitted", async () => {
    allowAudioImmediately = true;
    renderMedia();
    await screen.findByText("Connected");
    expect(screen.queryByRole("button", { name: "Enable incoming meeting audio" })).toBeNull();
  });

  it("retains the recovery action and explains permission errors", async () => {
    rejectAudio = true;
    renderMedia();
    fireEvent.click(await screen.findByRole("button", { name: "Enable incoming meeting audio" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Browser permission required"));
    expect(screen.getByRole("button", { name: "Enable incoming meeting audio" })).toBeTruthy();
  });

  it("responds to a later provider AudioPlaybackStatusChanged event", async () => {
    allowAudioImmediately = true;
    renderMedia();
    await screen.findByText("Connected");
    room.canPlaybackAudio = false;
    room.emit("audioPlaybackChanged");
    expect(await screen.findByRole("button", { name: "Enable incoming meeting audio" })).toBeTruthy();
  });
});
