import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/pages/archive-reports/MeetingRecordPage.tsx", "utf8");

describe("AR-08/10/11 and MN-05/10 — source read state and minutes field integrity", () => {
  it.each([
    ["decisionReg", "meetingDecisions"],
    ["resolutionReg", "meetingResolutions"],
    ["actionReg", "meetingActions"],
    ["minutesReg", "meetingMinutes"],
    ["auditReg", "meetingAudit"],
  ])("gates %s rows and controls behind its own read state", (reg, rows) => {
    const linked = ["decisionReg", "resolutionReg", "actionReg"].includes(reg);
    const error = linked ? reg.replace(/Reg$/, "ReadError") : `${reg}.error`;
    const start = page.indexOf(`{${error} || ${reg}.loading ? (`);
    expect(start).toBeGreaterThan(-1);
    const guarded = page.slice(start, start + 400);
    expect(guarded).toContain(`loading={!${error} && Boolean(${reg}.loading)}`);
    expect(guarded).toContain(linked ? `retry={() => Promise.all([meetingReg.refresh?.(), ${reg}.refresh?.()])}` : `retry={() => ${reg}.refresh?.()}`);
    expect(guarded).toContain(`) : ${rows}.length === 0 ? (`);
  });
  it("does not copy quorum text into the discussion field or hide its separate provenance", () => {
    expect(page).toContain('defaultValue={editSelection.discussion_summary ?? ""}');
    expect(page).not.toContain('defaultValue={m.discussion_summary ?? m.quorum_statement');
    expect(page).toContain('<KV label="Quorum Statement" value={m.quorum_statement} />');
    expect(page).toContain('discussion_summary: discussion');
    expect(page).toContain('persistMinutesReviewTransition<Minutes>(selection');
    expect(page).not.toContain('minutesReg.update(m.id, { discussion_summary: el.value })');
  });
});
