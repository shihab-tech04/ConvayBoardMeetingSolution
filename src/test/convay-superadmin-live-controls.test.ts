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
    expect(source).toContain('const hasGrant = (code: string) => access.loaded &&');
    expect(source).toContain('access.is_super_admin || access.effective_permissions.includes(code)');
    expect(source).toContain('const hasLeadership = access.is_super_admin || canRecord(myRole)');
    expect(source).toContain('const canRecordMeeting = hasLeadership && hasGrant("mtg_start")');
    expect(source).toContain("&& canRecordMeeting &&");
  });

  it("super admin can operate meeting controls while restricted roles need mtg_start", () => {
    expect(source).toContain("const canControlMeeting = (access.is_super_admin || canControl(myRole)) &&");
    expect(source).toContain('hasGrant("mtg_start") && hasGrant("mtg_update")');
    expect(source).toContain("&& canControlMeeting &&");
  });

  it("does not grant ballot eligibility solely because the user is Super Admin", () => {
    expect(source).toContain("canVote(myRole)");
    expect(source).not.toContain("access.is_super_admin || canVote(myRole)");
  });
});