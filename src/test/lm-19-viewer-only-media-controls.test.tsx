import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MeetingPreJoinPanel } from "../app/components/meetings/MeetingPreJoinPanel";

const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");

afterEach(cleanup);

describe("LM-19 role-restricted real-media controls", () => {
  it.each(["Observer", "Guest"] as const)(
    "%s can join subscribe-only without camera/mic buttons or capture",
    role => {
      const onJoin = vi.fn();
      render(<MeetingPreJoinPanel
        meeting={{ meeting_title: "Approved live meeting", mode: "Virtual" }}
        initialRole={role}
        publisherAllowed={false}
        onJoin={onJoin}
        onBack={vi.fn()}
      />);
      expect(screen.getByRole("status").textContent).toMatch(/View-only meeting access/);
      expect(screen.queryByRole("button", { name: /mute microphone|unmute microphone/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /turn on camera|turn off camera/i })).toBeNull();
      expect(screen.queryByRole("button", { name: "Join with devices off" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
      expect(onJoin).toHaveBeenCalledWith({ micOn: false, camOn: false, role });
    }
  );

  it("preserves microphone and camera controls for a saved publishing role", () => {
    const onJoin = vi.fn();
    render(<MeetingPreJoinPanel
      initialRole="Chairperson" publisherAllowed={true}
      onJoin={onJoin} onBack={vi.fn()}
    />);
    expect(screen.getByRole("button", { name: /mute microphone|unmute microphone/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /turn on camera|turn off camera/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Join with devices off" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Join Meeting" }));
    expect(onJoin).toHaveBeenCalledWith({
      micOn: false, camOn: false, role: "Chairperson",
    });
  });

  it("does not alter physical meeting media availability", () => {
    render(<MeetingPreJoinPanel
      initialRole="Observer" publisherAllowed={true}
      onJoin={vi.fn()} onBack={vi.fn()}
    />);
    expect(screen.getByRole("button", { name: /mute microphone|unmute microphone/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /turn on camera|turn off camera/i })).toBeTruthy();
  });

  it("gates media capture and publishing props before online connection", () => {
    expect(workspace).toContain('const canPublishMedia = !isOnlineMeeting');
    expect(workspace).toContain('publisherAllowed={canPublishMedia}');
    expect(workspace).toContain('micOn={canPublishMedia && myMicOn}');
    expect(workspace).toContain('camOn={canPublishMedia && myCamOn}');
    expect(workspace).toContain('sharing={canPublishMedia && shareRequested}');
    expect(workspace).toContain('{canPublishMedia && <DockButton active={myMicOn}');
    expect(workspace).toContain('{canPublishMedia && <DockButton active={myCamOn}');
    expect(workspace).toContain('!canPublishMedia && <span role="status"');
  });
});
