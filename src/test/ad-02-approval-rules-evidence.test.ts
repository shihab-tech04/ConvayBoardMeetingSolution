import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unverifiedApprovalRulesView } from "../app/pages/administration/workflowApprovalRulesEvidence";

describe("AD-02 real policy source evidence", () => {
  it("never displays fabricated production policy records", () => {
    expect(unverifiedApprovalRulesView().rows).toEqual([]);
  });
  it("never claims false verified counters or status counts", () => {
    const value = unverifiedApprovalRulesView();
    expect(value.kpis).toEqual([{ label: "Approval rules evidence", value: "Unverified", tone: "warning" }]);
    expect(value.kpis.some(k => /Total Rules|Active|Draft|Inactive/.test(k.label))).toBe(false);
  });
  it("fails closed until tenant-scoped authorized policy writes and reads exist", () => {
    const value = unverifiedApprovalRulesView();
    expect(value.description).toMatch(/not connected/);
    expect(value.unavailableReason).toMatch(/Tenant-scoped/);
    expect(value.unavailableReason).toMatch(/Creation and edits are disabled/);
  });
  it("returns independent evidence objects without retaining fabricated mutations", () => {
    const first = unverifiedApprovalRulesView();
    first.rows.push({rule_id:"FAKE"});
    first.kpis[0].value = "24";
    expect(unverifiedApprovalRulesView().rows).toEqual([]);
    expect(unverifiedApprovalRulesView().kpis[0].value).toBe("Unverified");
  });
  it("preserves approved page table, filters, action labels and drawer", () => {
    const source = readFileSync("src/app/pages/administration/WorkflowPages.tsx", "utf8");
    const section = source.split("export function ApprovalRulesPage() {")[1]?.split("export function ReviewRevisionRulesPage() {")[0] ?? "";
    expect(section).toContain("const evidence = unverifiedApprovalRulesView()");
    expect(section).toContain("dataError: evidence.unavailableReason");
    expect(section).toContain("rows:      evidence.rows");
    expect(section).toContain('entryBtn:  "Create Approval Rule"');
    expect(section).toContain("APPROVAL_RULE_DRAWER_COLS");
    expect(section).toContain("filters:      BASE_FILTERS");
    expect(section).not.toContain("approvalRuleRows");
  });
});
