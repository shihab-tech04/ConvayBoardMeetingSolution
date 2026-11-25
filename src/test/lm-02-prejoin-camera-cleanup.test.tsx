import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MeetingPreJoinPanel } from "../app/components/meetings/MeetingPreJoinPanel";

const originalDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const renderPanel = (onJoin = vi.fn()) => render(
  <MeetingPreJoinPanel initialRole="Board Member" onJoin={onJoin} onBack={vi.fn()} />,
);
const mockDevices = (getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>) => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true, value: getUserMedia ? { getUserMedia } : undefined,
  });
};
afterEach(() => {
  if (originalDevices) Object.defineProperty(navigator, "mediaDevices", originalDevices);
  else delete (navigator as { mediaDevices?: MediaDevices }).mediaDevices;
  vi.restoreAllMocks();
});

describe("LM-02 camera pre-join cleanup and truthful readiness", () => {
  it("handles browsers without camera APIs and keeps device-off admission available", async () => {
    mockDevices();
    const onJoin = vi.fn();
    renderPanel(onJoin);
    expect(screen.queryByText("Camera unavailable")).toBeNull();
    expect(screen.getByText("Camera is off")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await screen.findByText("Camera unavailable");
    expect(screen.getByText("Checked on join")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
    expect(onJoin).toHaveBeenCalledWith({ micOn: false, camOn: false, role: "Board Member" });
  });

  it("stops a late stream granted after the user turned camera off", async () => {
    let grant!: (stream: MediaStream) => void;
    const media = new Promise<MediaStream>(resolve => { grant = resolve; });
    mockDevices(vi.fn(() => media));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn off camera" }));
    const stop = vi.fn();
    await act(async () => grant({ getTracks: () => [{ stop }] } as unknown as MediaStream));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Camera is off")).toBeTruthy();
  });

  it("stops a late stream granted after leaving the pre-join screen", async () => {
    let grant!: (stream: MediaStream) => void;
    mockDevices(vi.fn(() => new Promise<MediaStream>(resolve => { grant = resolve; })));
    const rendered = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    rendered.unmount();
    const stop = vi.fn();
    await act(async () => grant({ getTracks: () => [{ stop }] } as unknown as MediaStream));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("attaches a permitted preview and stops its tracks when leaving", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    mockDevices(vi.fn(async () => stream));
    const rendered = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    const video = await screen.findByLabelText("Camera preview");
    await waitFor(() => expect(video.querySelector("video")?.srcObject).toBe(stream));
    rendered.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("does not show a false camera-ready status after a permission denial", async () => {
    mockDevices(vi.fn(async () => { throw new Error("not allowed"); }));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await screen.findByText("Camera unavailable");
    expect(screen.getByText("Camera is off")).toBeTruthy();
    expect(screen.getByText("Checked on join")).toBeTruthy();
  });
});
