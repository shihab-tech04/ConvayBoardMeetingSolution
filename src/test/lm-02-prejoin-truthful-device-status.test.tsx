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

describe("LM-02 prejoin meeting time integrity", () => {
  it("renders a real SQL 24-hour meeting time without changing the join options", () => {
    setMediaDevices(() => new Promise<MediaStream>(() => {}));
    const onJoin = vi.fn();
    render(<MeetingPreJoinPanel meeting={{ start_time: "14:05:00" }} initialRole="Board Member" onJoin={onJoin} onBack={vi.fn()} />);
    expect(screen.getByText("2:05 PM")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
    expect(onJoin).toHaveBeenCalledWith({ micOn: false, camOn: false, role: "Board Member" });
  });

  it.each(["25:99", "24:00", "10:60", "12:30:60", "abc:30", "12:5", "14:00garbage"])(
    "does not turn invalid meeting time %s into authoritative display",
    (value) => {
      setMediaDevices(() => new Promise<MediaStream>(() => {}));
      render(<MeetingPreJoinPanel meeting={{ start_time: value }} initialRole="Board Member" onJoin={vi.fn()} onBack={vi.fn()} />);
      expect(screen.queryByText("Time")).toBeNull();
      expect(screen.queryByText(/NaN|Invalid Date/)).toBeNull();
    },
  );
});

describe("LM-02 prejoin media status is evidence-based", () => {
  it("does not claim microphone permission is granted before joining", () => {
    setMediaDevices(() => new Promise<MediaStream>(() => {}));
    const onJoin = vi.fn();
    const { unmount } = renderPanel(onJoin);
    expect(screen.getByText("Muted · optional")).toBeTruthy();
    expect(screen.getByText("Off · optional")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
    expect(onJoin).toHaveBeenCalledWith({ micOn: false, camOn: false, role: "Board Member" });
    unmount();
  });

  it("only marks camera preview active after a real media stream arrives", async () => {
    let grant!: (stream: MediaStream) => void;
    setMediaDevices(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
    const stop = vi.fn();
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    expect(screen.getByText("Checking camera")).toBeTruthy();
    await act(async () => grant({ getTracks: () => [{ stop }] } as unknown as MediaStream));
    await screen.findByText("Preview active");
    fireEvent.click(screen.getByRole("button", { name: "Turn off camera" }));
    await waitFor(() => expect(screen.getByText("Off · optional")).toBeTruthy());
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("shows the camera off after an unavailable camera API", async () => {
    setMediaDevices();
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await screen.findByText("Camera unavailable");
    expect(screen.getByText("Off · optional")).toBeTruthy();
    expect(screen.queryByText("Preview active")).toBeNull();
  });

  it("does not mark a denied camera preview active", async () => {
    setMediaDevices(async () => { throw new Error("Permission denied"); });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await screen.findByText("Camera unavailable");
    expect(screen.queryByText("Preview active")).toBeNull();
    expect(screen.getByText("Off · optional")).toBeTruthy();
  });
});
