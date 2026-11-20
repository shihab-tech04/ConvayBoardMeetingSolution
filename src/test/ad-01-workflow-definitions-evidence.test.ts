import { describe, expect, it } from "vitest";
import { unverifiedWorkflowDefinitionsView } from "../app/pages/administration/workflowDefinitionsEvidence";

describe("AD-01 workflow definition source evidence", () => {
  it("shows zero fabricated workflow definition rows", () => {
    expect(unverifiedWorkflowDefinitionsView().rows).toEqual([]);
  });
  it("does not report invented total/active/draft counts as genuine KPIs", () => {
    const view = unverifiedWorkflowDefinitionsView();
    expect(view.kpis).toHaveLength(1);
    expect(view.kpis[0]).toMatchObject({label:"Definitions evidence",value:"Unverified",tone:"warning"});
    expect(view.kpis.some(k=>/Total Workflows|Active|Draft|Inactive/.test(k.label))).toBe(false);
  });
  it("explains the absent versioned SQL configuration source and writes", () => {
    const view = unverifiedWorkflowDefinitionsView();
    expect(view.description).toMatch(/not connected/);
    expect(view.unavailableReason).toMatch(/Creation and edits are disabled/);
    expect(view.unavailableReason).toMatch(/tenant authorization/);
  });
  it("cannot retain mock workflow rows or a forged KPI across projection calls", () => {
    const one = unverifiedWorkflowDefinitionsView();
    one.rows.push({id:"fake-workflow"});
    one.kpis[0].value = "28";
    const two = unverifiedWorkflowDefinitionsView();
    expect(two.rows).toHaveLength(0);
    expect(two.kpis[0].value).toBe("Unverified");
  });
});
