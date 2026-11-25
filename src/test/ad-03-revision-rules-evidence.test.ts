import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unverifiedRevisionRulesView } from "../app/pages/administration/workflowRevisionRulesEvidence";

describe("AD-03 real policy source evidence", () => {
  it("never displays fabricated production policy records", () => {
    expect(unverifiedRevisionRulesView().rows).toEqual([]);
  });
  it("never claims false verified counters or status counts", () => {
    const value = unverifiedRevisionRulesView();
    expect(value.kpis).toEqual([{ label: "Review rules evidence", value: "Unverified", tone: "warning" }]);
    expect(value.kpis.some(k => /Total Rules|Active|Draft|Inactive/.test(k.label))).toBe(false);
  });
  it("fails closed until tenant-scoped authorized policy writes and reads exist", () => {
    const value = unverifiedRevisionRulesView();
    expect(value.description).toMatch(/not connected/);
    expect(value.unavailableReason).toMatch(/Tenant-scoped/);
    expect(value.unavailableReason).toMatch(/Creation and edits are disabled/);
  });
  it("returns independent evidence objects without retaining fabricated mutations", () => {
    const first = unverifiedRevisionRulesView();
    first.rows.push({rule_id:"FAKE"});
    first.kpis[0].value = "24";
    expect(unverifiedRevisionRulesView().rows).toEqual([]);
    expect(unverifiedRevisionRulesView().kpis[0].value).toBe("Unverified");
  });
  it("preserves approved page table, filters, action labels and drawer", () => {
    const source = readFileSync("src/app/pages/administration/WorkflowPages.tsx", "utf8");
    const section = source.split("export function ReviewRevisionRulesPage() {")[1]?.split("export function WorkflowHistoryPage() {")[0] ?? "";
    expect(section).toContain("const evidence = unverifiedRevisionRulesView()");
    expect(section).toContain("dataError: evidence.unavailableReason");
    expect(section).toContain("rows:      evidence.rows");
    expect(section).toContain('entryBtn:  "Create Revision Rule"');
    expect(section).toContain("REVISION_RULE_DRAWER_COLS");
    expect(section).toContain("filters:      BASE_FILTERS");
    expect(section).not.toContain("revisionRuleRows");
  });
});
