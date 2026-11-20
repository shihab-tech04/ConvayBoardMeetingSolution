import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MeetingPreJoinPanel } from "../app/components/meetings/MeetingPreJoinPanel";

const originalDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const setMediaDevices = (getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>) => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: getUserMedia ? { getUserMedia } : undefined,
  });
};
const renderPanel = (onJoin = vi.fn()) =>
  render(<MeetingPreJoinPanel initialRole="Board Member" onJoin={onJoin} onBack={vi.fn()} />);

afterEach(() => {
  if (originalDevices) Object.defineProperty(navigator, "mediaDevices", originalDevices);
  else delete (navigator as { mediaDevices?: MediaDevices }).mediaDevices;
  vi.restoreAllMocks();
});

describe("LM-02 prejoin media status is evidence-based", () => {
  it("does not claim microphone permission is granted before joining", () => {
    setMediaDevices(() => new Promise<MediaStream>(() => {}));
    const onJoin = vi.fn();
    const { unmount } = renderPanel(onJoin);
    expect(screen.getByText("Enabled on join")).toBeTruthy();
    expect(screen.getByText("Checking camera")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
    expect(onJoin).toHaveBeenCalledWith({ micOn: true, camOn: true, role: "Board Member" });
    unmount();
  });

  it("only marks camera preview active after a real media stream arrives", async () => {
    let grant!: (stream: MediaStream) => void;
    setMediaDevices(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
    const stop = vi.fn();
    renderPanel();
    expect(screen.getByText("Checking camera")).toBeTruthy();
    await act(async () => grant({ getTracks: () => [{ stop }] } as unknown as MediaStream));
    await screen.findByText("Preview active");
    fireEvent.click(screen.getByRole("button", { name: "Turn off camera" }));
    await waitFor(() => expect(screen.getByText("Off")).toBeTruthy());
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("shows the camera off after an unavailable camera API", async () => {
    setMediaDevices();
    renderPanel();
    await screen.findByText("Camera unavailable");
    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.queryByText("Preview active")).toBeNull();
  });

  it("does not mark a denied camera preview active", async () => {
    setMediaDevices(async () => { throw new Error("Permission denied"); });
    renderPanel();
    await screen.findByText("Camera unavailable");
    expect(screen.queryByText("Preview active")).toBeNull();
    expect(screen.getByText("Off")).toBeTruthy();
  });
});
