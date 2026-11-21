import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedQuorumRulesView } from "../app/pages/administration/quorumRulesEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/MeetingConfigPages.tsx"),
  "utf8",
);
const quorumPage = pageSource
  .split("export function QuorumRulesPage() {")[1]
  ?.split("export function VotingMethodsPage() {")[0] ?? "";

describe("AD-06 quorum rule evidence state", () => {
  it("does not present mock rules as configured policies", () => {
    const evidence = unverifiedQuorumRulesView();

    expect(evidence.rows).toEqual([]);
    expect(quorumPage).not.toMatch(/fallbackRows|displayRows/);
    expect(quorumPage).not.toContain("gen(16");
    expect(quorumPage).not.toMatch(/Total Rules|Governance Bodies/);
  });

  it("explains the missing evidence and why configuration is blocked", () => {
    const evidence = unverifiedQuorumRulesView();

    expect(evidence.description).toContain("versioned quorum policy source");
    expect(evidence.description).toContain("No sample rules");
    expect(evidence.unavailableReason).toContain("active votes");
    expect(evidence.unavailableReason).toContain("disabled");
  });

  it("keeps the existing table, mobile, filter, drawer, and entry structure", () => {
    expect(quorumPage).toContain('filters:      BASE_FILTERS');
    expect(quorumPage).toContain('actions:      ROW_VIEW');
    expect(quorumPage).toContain('drawerTitle:  "Quorum Rule Details"');
    expect(quorumPage).toContain("drawerCols:   QUORUM_RULE_DRAWER_COLS");
    expect(quorumPage).toContain('entryBtn:  "Create Quorum Rule"');
    expect(quorumPage).toContain("mobileCardMapping:");
  });

  it("uses the authoritative loading, error, and retry state and fails closed", () => {
    expect(quorumPage).toContain("dataLoading: registry.loading");
    expect(quorumPage).toContain("dataError: registry.error ?? (registry.loading ? null : evidence.unavailableReason)");
    expect(quorumPage).toContain("onDataRetry: registry.refresh");
    expect(quorumPage).toContain("rows:      evidence.rows");
  });
});
