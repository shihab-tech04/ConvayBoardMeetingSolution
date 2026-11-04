import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const start = workspace.indexOf("const setCtrlStatus = useCallback(async");
const end = workspace.indexOf("const hasSyncedCanonical = useRef(false);",start);
const statusHandler = workspace.slice(start,end);

describe("Meeting live status and SQL session parity", () => {
  it("commits both authoritative records before updating UI status", () => {
    expect(statusHandler).toContain("await convayAuth.applyBatch([");
    expect(statusHandler).toContain('entity_key: "bms.meetings"');
    expect(statusHandler).toContain('entity_key: "bms.liveSessions"');
    expect(statusHandler.indexOf("await convayAuth.applyBatch(["))
      .toBeLessThan(statusHandler.indexOf("setCtrlStatusRaw(nextStatus)"));
  });
  it("maps pause, break and adjourn to a paused canonical session and resume to active", () => {
    expect(statusHandler).toContain('nextStatus === "in-progress" ? "active" : "paused"');
    expect(statusHandler).toContain("CTRL_TO_APPROVAL[nextStatus]");
  });
  it("prevents concurrent writes and does not update UI when SQL fails", () => {
    expect(statusHandler).toContain("statusRequestPending.current");
    expect(statusHandler).toContain("if (!session)");
    expect(statusHandler).toContain("statusRequestPending.current = true");
    expect(statusHandler).toContain("statusRequestPending.current = false");
    const catchBlock = statusHandler.slice(statusHandler.indexOf("} catch (error)"));
    expect(catchBlock).not.toContain("setCtrlStatusRaw(");
  });
  it("restores the authoritative state after registries finish loading", () => {
    expect(workspace).toContain("}, [meetingId, meeting, liveSessions]);");
    expect(workspace).toContain('persistedStatus === "On Break" ? "on-break"');
    expect(workspace).toContain('persistedStatus === "Adjourned" ? "adjourned"');
  });
  it("disables all four controls during SQL confirmation", () => {
    expect((workspace.match(/disabled=\{statusBusy\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(workspace).toContain("disabled={quorumMet || statusBusy}");
  });
});
