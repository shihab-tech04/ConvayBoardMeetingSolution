import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");

describe("Super Admin full live-meeting Maker and Checker controls", () => {
  it("reads the server verified access snapshot and refreshes it", () => {
    expect(source).toContain('import { reloadAccessSnapshot, useAccessSnapshot }');
    expect(source).toContain("const access = useAccessSnapshot()");
    expect(source).toContain("reloadAccessSnapshot().catch");
  });

  it("Super Admin can use all meeting-record actions independently of participant type", () => {
    expect(source).toContain('const canRecordMeeting = access.loaded && (access.is_super_admin || canRecord(myRole))');
    expect(source).toContain("if (!canRecordMeeting)");
    expect(source).toContain("&& canRecordMeeting &&");
  });

  it("super admin can operate meeting controls while restricted roles need mtg_start", () => {
    expect(source).toContain("access.is_super_admin || (canControl(myRole) && access.effective_permissions.includes(\"mtg_start\"))");
    expect(source).toContain("&& canControlMeeting &&");
  });

  it("does not grant ballot eligibility solely because the user is Super Admin", () => {
    expect(source).toContain("canVote(myRole)");
    expect(source).not.toContain("access.is_super_admin || canVote(myRole)");
  });
});