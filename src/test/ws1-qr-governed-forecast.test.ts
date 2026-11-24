import { describe, expect, it } from "vitest";
import { calculateMeetingQuorum, type QuorumInput } from "../app/utils/quorumCalculation";

const links = Array.from({ length: 5 }, (_, i) => ({ user_id: `m${i + 1}`, quorum_eligible: true, participant_type: i === 0 ? "Chairperson" : "Member" }));
const baseRule = { governance_body_id: "board", status: "Active", minimum_members: "0", quorum_percent: "60%" };
function forecast(present: string[] | undefined, patch = {}, assigned = links) {
  return calculateMeetingQuorum({ boardCommitteeId: "board", governanceBodies: [{ id: "board" }], quorumRules: [{ ...baseRule, ...patch }], participantLinks: assigned, presentUserIds: present === undefined ? undefined : new Set(present) } as unknown as QuorumInput);
}

describe("WS1 QR-06/08/09/10 governed forecast", () => {
  it("does not recalculate the denominator from the present subset", () => {
    expect(forecast(["m1", "m2"])).toMatchObject({ status: "not_expected", requiredCount: 3, eligibleCount: 2, selectedEligibleCount: 5 });
    expect(forecast(["m1", "m2", "m3"])).toMatchObject({ status: "expected", requiredCount: 3, eligibleCount: 3 });
  });
  it("uses ceiling and distinct eligible membership, ignoring observers", () => {
    expect(forecast(["m1", "m2", "m3"], { quorum_percent: "61%" }, [...links, links[0], { user_id: "observer", quorum_eligible: false, participant_type: "Observer" }])).toMatchObject({ requiredCount: 4, selectedEligibleCount: 5, eligibleCount: 3, status: "at_risk" });
  });
  it("fails a missing mandatory role despite sufficient eligible attendance", () => {
    expect(forecast(["m2", "m3", "m4"], { required_roles: ["Chairperson"] })).toMatchObject({ status: "not_expected", missingRoles: ["Chairperson"] });
    expect(forecast(["m1", "m2", "m3"], { required_roles: " Chairperson " })).toMatchObject({ status: "expected", missingRoles: [] });
  });
  it("uses normalized thresholds before legacy fields", () => {
    expect(forecast(["m1", "m2", "m3"], { minimum_members_count: 4, minimum_percentage: 0 })).toMatchObject({ requiredCount: 4, status: "at_risk" });
  });
  it("never forecasts met with no assigned eligible members or no positive threshold", () => {
    expect(forecast([], {}, [])).toMatchObject({ status: "not_expected" });
    expect(forecast(undefined, { quorum_percent: "0%" })).toMatchObject({ status: "not_expected" });
  });
  it("fails closed for invalid percentage or unresolved normalized role IDs", () => {
    expect(forecast(undefined, { minimum_percentage: 101 })).toMatchObject({ status: "not_expected" });
    expect(forecast(undefined, { rule_type: "role_based", required_role_ids: ["role-chair"] })).toMatchObject({ status: "not_expected" });
  });
  it("still distinguishes missing policy and forecast without attendance", () => {
    expect(forecast(undefined, { status: "Inactive" })).toMatchObject({ status: "not_configured" });
    expect(forecast(undefined)).toMatchObject({ status: "expected", eligibleCount: 5, requiredCount: 3 });
  });
});
