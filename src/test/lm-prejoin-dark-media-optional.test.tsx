import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MeetingPreJoinPanel } from "../app/components/meetings/MeetingPreJoinPanel";

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const getUserMedia = vi.fn(async (): Promise<MediaStream> => {
  throw new Error("Permission denied");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  if (originalMediaDevices) Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  else delete (navigator as { mediaDevices?: MediaDevices }).mediaDevices;
  delete document.documentElement.dataset.theme;
});

function present(theme: "dark-mode" | "light-mode", extra: Partial<Parameters<typeof MeetingPreJoinPanel>[0]> = {}) {
  document.documentElement.dataset.theme = theme;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true, value: { getUserMedia },
  });
  const onJoin = vi.fn();
  const onForceStart = vi.fn();
  const component = render(<MeetingPreJoinPanel
    initialRole="Chairperson"
    publisherAllowed={true}
    meeting={{ id: "MTG-PREJOIN-TEST", meeting_title: "Board Meeting", mode: "Virtual" }}
    onJoin={onJoin} onForceStart={onForceStart} onBack={vi.fn()}
    {...extra}
  />);
  return { ...component, onJoin, onForceStart };
}

describe.each(["light-mode", "dark-mode"] as const)("Pre-join optional-media / %s", theme => {
  it("never requests camera/microphone access just by opening the page", () => {
    const { onJoin } = present(theme);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByText("Muted · optional")).toBeTruthy();
    expect(screen.getByText("Off · optional")).toBeTruthy();
    expect(screen.getByText(/Camera and microphone are optional/)).toBeTruthy();
    expect(screen.queryByText("Camera unavailable")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
    expect(onJoin).toHaveBeenCalledWith({ micOn: false, camOn: false, role: "Chairperson" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("permits an eligible Super Admin start even with both devices switched off", () => {
    const { onForceStart } = present(theme, {
      joinBlockedReason: "Waiting for an authorized host to start.",
      startLabel: "Force Start Now",
    });
    expect(screen.getByRole("button", { name: "Join Meeting" }).hasAttribute("disabled")).toBe(true);
    const start = screen.getByRole("button", { name: "Force Start Now" });
    expect(start.hasAttribute("disabled")).toBe(false);
    fireEvent.click(start);
    expect(onForceStart).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("only checks camera permission after a deliberate camera-on action; denial does not block joining", async () => {
    const { onJoin } = present(theme);
    fireEvent.click(screen.getByRole("button", { name: "Turn on camera" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false }));
    expect(await screen.findByText("Camera unavailable")).toBeTruthy();
    expect(screen.getByText("Off · optional")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
    expect(onJoin).toHaveBeenCalledWith({ micOn: false, camOn: false, role: "Chairperson" });
  });
});

describe.each(["light-mode", "dark-mode"] as const)("Terminal SQL meeting status in %s", theme => {
  it("shows an ended meeting as ended, never as a waiting LiveKit room", () => {
    present(theme, {
      meeting: {
        id: "MTG-ENDED", meeting_title: "Completed Board Meeting",
        approval_status: "Awaiting Minutes", mode: "Virtual",
      },
      joinBlockedReason: "This meeting is closed and cannot be joined or restarted.",
    });
    expect(screen.getByText("Meeting ended")).toBeTruthy();
    expect(screen.queryByText("Waiting for LiveKit meeting")).toBeNull();
    expect(screen.getByRole("button", { name: "Join Meeting" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Force Start Now" })).toBeNull();
  });
});

describe("Pre-join approved design tokens", () => {
  it("keeps the camera stage dark and text readable independently of theme primary text color", () => {
    const css = readFileSync("src/styles/live-meeting.css", "utf8");
    const camera = css.match(/\.meeting-prejoin__camera-well\s*\{([^}]*)\}/)?.[1] ?? "";
    const label = css.match(/\.meeting-prejoin__camera-off-label\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(css).toContain("--prejoin-media-surface: #211d30");
    expect(css).toContain("--prejoin-media-foreground: #f4f2fa");
    expect(camera).toContain("background: var(--prejoin-media-surface)");
    expect(camera).not.toContain("background: var(--color-text-primary)");
    expect(label).toContain("color: var(--prejoin-media-foreground)");
    expect(css).toContain(".meeting-prejoin__alert .meeting-prejoin__alert-text");
    expect(css).toContain(".meeting-prejoin__device-note");
    expect(css).toContain(".pj-muted");
  });
});
