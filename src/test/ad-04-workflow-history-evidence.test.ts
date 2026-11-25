import { describe, expect, it } from "vitest";
import { unverifiedWorkflowHistoryView } from "../app/pages/administration/workflowHistoryEvidence";

describe("AD-04 workflow history evidence", () => {
  it("does not present simulated approval events as history", () => {
    const view = unverifiedWorkflowHistoryView();
    expect(view.rows).toEqual([]);
  });
  it("does not claim zero verified events or workflow completions", () => {
    const view = unverifiedWorkflowHistoryView();
    expect(view.kpis).toHaveLength(1);
    expect(view.kpis[0]).toMatchObject({ label: "History evidence", value: "Unverified" });
    expect(view.kpis.some(k => /Total Events|Completed|Cancelled/.test(k.label))).toBe(false);
  });
  it("explains the absent authenticated journal and pending readback", () => {
    const view = unverifiedWorkflowHistoryView();
    expect(view.description).toMatch(/not connected/);
    expect(view.description).toMatch(/unverified/i);
    expect(view.disabledReason).toMatch(/authenticated workflow event journal/);
  });
  it("does not share mutable arrays between page reads", () => {
    const first = unverifiedWorkflowHistoryView();
    first.rows.push({ id: "fabricated" });
    first.kpis[0].value = "Connected";
    const second = unverifiedWorkflowHistoryView();
    expect(second.rows).toEqual([]);
    expect(second.kpis[0].value).toBe("Unverified");
  });
});
