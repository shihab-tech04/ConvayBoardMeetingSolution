import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { recordListCountLabel } from "../app/pages/archive-reports/recordListState";

describe("AR-03 — authoritative meeting overview counts", () => {
  it("distinguishes loaded empty and populated counts", () => {
    expect(recordListCountLabel(false, null, 0)).toBe("0");
    expect(recordListCountLabel(false, null, 3)).toBe("3");
  });
  it("does not label pending or failed reads as zero or expose stale counts", () => {
    expect(recordListCountLabel(true, null, 0)).toBe("Loading…");
    expect(recordListCountLabel(true, null, 7)).toBe("Loading…");
    expect(recordListCountLabel(false, "permission denied", 0)).toBe("Unavailable");
    expect(recordListCountLabel(true, "permission denied", 7)).toBe("Unavailable");
    expect(recordListCountLabel(false, null, -1)).toBe("Unavailable");
    expect(recordListCountLabel(false, null, NaN)).toBe("Unavailable");
  });
  it("uses independent source readiness including both agenda registries", () => {
    const page = readFileSync("src/app/pages/archive-reports/MeetingRecordPage.tsx", "utf8");
    for (const expression of [
      "recordListCountLabel(Boolean(agendaReg.loading || agendaLinks.loading), agendaReg.error || agendaLinks.error, meetingAgendas.length)",
      "recordListCountLabel(Boolean(minutesReg.loading), minutesReg.error, meetingMinutes.length)",
      "recordListCountLabel(Boolean(decisionReg.loading), decisionReadError, meetingDecisions.length)",
      "recordListCountLabel(Boolean(actionReg.loading), actionReadError, meetingActions.length)",
    ]) expect(page).toContain(expression);
  });
});
