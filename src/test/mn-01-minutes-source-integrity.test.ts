import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveMinutesSource } from "../app/pages/archive-reports/minutesSourceIntegrity";

const sourceMeeting = {
  id: "meeting-uuid-1", meeting_id: "MTG-2026-0001", meeting_title: "Annual Board Meeting",
  meeting_date: "2026-11-01", approval_status: "Awaiting Minutes",
};

describe("MN-01 minutes source integrity", () => {
  it("carries the authoritative meeting ID/title/date into a new draft", () => {
    expect(resolveMinutesSource("MTG-2026-0001", "Annual Board Meeting", [sourceMeeting]))
      .toEqual({ meeting_id: "MTG-2026-0001", meeting_title: "Annual Board Meeting", meeting_date: "2026-11-01" });
  });
  it("rejects incorrect, inaccessible and mismatched meeting references", () => {
    expect(() => resolveMinutesSource("", "Annual Board Meeting", [sourceMeeting])).toThrow();
    expect(() => resolveMinutesSource("MTG-other-tenant", "Annual Board Meeting", [sourceMeeting])).toThrow();
    expect(() => resolveMinutesSource("MTG-2026-0001", "Wrong Meeting", [sourceMeeting])).toThrow();
  });
  it("rejects unfinished and already approved meeting contexts", () => {
    for (const status of ["Draft", "In Progress", "Paused", "Minutes Approved"]) {
      expect(() => resolveMinutesSource("MTG-2026-0001", "Annual Board Meeting", [
        { ...sourceMeeting, approval_status: status },
      ])).toThrow();
    }
  });
  it("requires permission, confirmed SQL create and immutable meeting linkage on edit", () => {
    const page = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    expect(page).toContain('access.effective_permissions.includes("min_create")');
    expect(page).toContain('const saved = await registry.add(');
    expect(page).toContain('if (saved !== true) throw new Error(');
    expect(page).toContain('original.approval_status !== "Draft"');
    expect(page).toContain('const saved = await registry.update(id, {');
  });
});
