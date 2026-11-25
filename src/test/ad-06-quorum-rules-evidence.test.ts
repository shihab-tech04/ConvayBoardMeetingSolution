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

describe("AD-06 versioned quorum rule evidence state", () => {
  it("does not present mock rules or false configuration KPIs as real policies", () => {
    const legacyEvidence = unverifiedQuorumRulesView();
    expect(legacyEvidence.rows).toEqual([]);
    expect(quorumPage).not.toMatch(/fallbackRows|displayRows|gen\(16|Total Rules/);
    expect(quorumPage).toContain("rows,");
    expect(quorumPage).toContain("registry.items.map(rule");
    expect(quorumPage).toContain('convayAuth.registry<VersionedQuorumRule>("bms.quorumrules", "list")');
  });

  it("requires real governance-body setup and administrative authorization before creating policies", () => {
    expect(quorumPage).toContain('hasAccess("admin_config", access)');
    expect(quorumPage).toContain("activeMeetingGovernanceOptions(governance.items)");
    expect(quorumPage).toContain("bodies.length > 0 && canManageQuorum");
    expect(quorumPage).toContain("An active Board / Committee must exist");
    expect(quorumPage).not.toContain("sampleRules");
  });

  it("keeps the existing table, mobile mapping, filter, drawer, and guarded create structure", () => {
    expect(quorumPage).toContain("filters: BASE_FILTERS");
    expect(quorumPage).toContain("actions: ROW_VIEW");
    expect(quorumPage).toContain('drawerTitle: "Quorum Rule Details"');
    expect(quorumPage).toContain('dg("Policy"');
    expect(quorumPage).toContain('dg("Thresholds"');
    expect(quorumPage).toContain('entryBtn: bodies.length > 0 && canManageQuorum ? "Create Quorum Rule" : undefined');
    expect(quorumPage).toContain("mobileCardMapping:");
    expect(quorumPage).toContain("awaitCreateSave: true");
  });

  it("uses authoritative combined loading/error/retry and only reports confirmed SQL writes", () => {
    expect(quorumPage).toContain("dataLoading: registry.loading || governance.loading");
    expect(quorumPage).toContain("dataError: registry.error ?? governance.error");
    expect(quorumPage).toContain("onDataRetry: async");
    expect(quorumPage).toContain("registry.refresh?.()");
    expect(quorumPage).toContain("governance.refresh?.()");
    expect(quorumPage).toContain("createVersionedQuorumRule(values");
    expect(quorumPage).toContain("deactivateQuorumRule(id, gateway)");
  });
});
