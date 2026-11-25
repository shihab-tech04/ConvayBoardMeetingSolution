import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedVotingMethodsView } from "../app/pages/administration/votingMethodsEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/MeetingConfigPages.tsx"),
  "utf8",
);
const votingPage = pageSource
  .split("export function VotingMethodsPage() {")[1]
  ?.split("export function StatusesNumberingPage() {")[0] ?? "";

describe("AD-07 voting method evidence state", () => {
  it("does not present synthetic methods or counters as configured policies", () => {
    const evidence = unverifiedVotingMethodsView();

    expect(evidence.rows).toEqual([]);
    expect(votingPage).not.toContain("gen(16");
    expect(votingPage).not.toMatch(/Total Methods|value: String\(votingMethodRows/);
    expect(votingPage).not.toContain("rows:      votingMethodRows");
  });

  it("explains the missing policy and engine evidence", () => {
    const evidence = unverifiedVotingMethodsView();

    expect(evidence.description).toContain("versioned voting method policy source");
    expect(evidence.description).toContain("No sample methods");
    expect(evidence.unavailableReason).toContain("majority and eligibility enforcement");
    expect(evidence.unavailableReason).toContain("secret-vote visibility");
    expect(evidence.unavailableReason).toContain("tested voting engine");
    expect(evidence.unavailableReason).toContain("disabled");
  });

  it("preserves the approved table, mobile, filter, drawer, and entry structure", () => {
    expect(votingPage).toContain('fc("method_type",    "Type")');
    expect(votingPage).toContain('fc("majority_rule",  "Majority Rule")');
    expect(votingPage).toContain('fc("applicable_to",  "Applicable To")');
    expect(votingPage).toContain('fc("eligible_voters","Eligible Voters")');
    expect(votingPage).toContain('filters:      BASE_FILTERS');
    expect(votingPage).toContain('actions:      ROW_VIEW');
    expect(votingPage).toContain('drawerTitle:  "Voting Method Details"');
    expect(votingPage).toContain("drawerCols:   VOTING_METHOD_DRAWER_COLS");
    expect(votingPage).toContain('entryBtn:  "Create Voting Method"');
    expect(votingPage).toContain("mobileCardMapping:");
  });

  it("uses registry loading, error, and retry state and fails closed", () => {
    expect(votingPage).toContain("dataLoading: registry.loading");
    expect(votingPage).toContain("dataError: registry.error ?? (registry.loading ? null : evidence.unavailableReason)");
    expect(votingPage).toContain("onDataRetry: registry.refresh");
    expect(votingPage).toContain("rows:      evidence.rows");
  });
});
