import { describe, expect, it } from "vitest";
import { calculateMeetingQuorum, type QuorumInput } from "../app/utils/quorumCalculation";

const bodies = [{ id: "board-a", body_id: "BA", body_name: "Board A" }, { id: "board-b", body_id: "BB", body_name: "Board B" }];
const policy = (id: string, min: number, meeting_id?: string, patch = {}) => ({ id, rule_id: id, governance_body_id: "board-a", status: "Active", minimum_members: String(min), quorum_percent: "0%", meeting_id, ...patch });
const general = policy("general", 1);
const own = policy("own", 3, "meeting-a");
const foreign = policy("foreign", 1, "meeting-b");
const links = [{ user_id: "member-a", quorum_eligible: true, participant_type: "Member" }];
const forecast = (rules: unknown[], meetingId?: string, extras = {}) => calculateMeetingQuorum({ boardCommitteeId: "board-a", meetingId, governanceBodies: bodies, quorumRules: rules, participantLinks: links, ...extras } as unknown as QuorumInput);

describe("WS1 meeting-specific quorum policy selection", () => {
  it("prefers the exact meeting policy over the governance default in either order", () => {
    for (const rules of [[general, own], [own, general]]) {
      expect(forecast(rules, "meeting-a")).toMatchObject({ status: "not_expected", requiredCount: 3, selectedRule: { id: "own" } });
    }
  });
  it("never consumes another meeting's policy or assumes a default", () => {
    expect(forecast([foreign], "meeting-a")).toMatchObject({ status: "not_configured" });
    expect(forecast([foreign])).toMatchObject({ status: "not_configured" });
    expect(forecast([foreign, general], "meeting-a")).toMatchObject({ status: "expected", selectedRule: { id: "general" } });
  });
  it("ignores inactive scoped policies", () => {
    expect(forecast([{ ...own, status: "Inactive" }, general], "meeting-a")).toMatchObject({ status: "expected", selectedRule: { id: "general" } });
  });
  it("fails closed when active scoped rules conflict, without falling back to a weaker rule", () => {
    expect(forecast([own, policy("duplicate", 1, "meeting-a"), general], "meeting-a")).toMatchObject({ status: "not_expected", reasons: ["Multiple active quorum policies for this meeting"] });
  });
  it("fails closed on ambiguous governance defaults", () => {
    expect(forecast([general, policy("duplicate", 3)])).toMatchObject({ status: "not_expected", reasons: ["Multiple active quorum policies for this governance body"] });
  });
  it("uses canonical body identity before duplicate display names", () => {
    const ambiguous = [...bodies, { id: "board-c", body_id: "BC", body_name: "Board A" }];
    expect(forecast([general], undefined, { governanceBodies: ambiguous })).toMatchObject({ status: "expected", selectedRule: { id: "general" } });
    expect(forecast([general], undefined, { boardCommitteeId: "Board A", governanceBodies: ambiguous })).toMatchObject({ status: "not_expected" });
  });
  it("retains the distinct assigned denominator under a meeting-specific percentage policy", () => {
    const assigned = Array.from({length: 5}, (_, i) => ({ user_id: "u" + i, quorum_eligible: true, participant_type: "Member" }));
    const scoped = policy("scoped", 0, "meeting-a", { minimum_percentage: 60 });
    expect(forecast([general, scoped], "meeting-a", {participantLinks: assigned, presentUserIds: new Set(["u0", "u1"])})).toMatchObject({ status: "not_expected", requiredCount: 3, eligibleCount: 2, selectedEligibleCount: 5 });
  });
  it("does not allow a meeting-specific rule to bypass a required role", () => {
    expect(forecast([general, policy("role", 1, "meeting-a", { required_roles: ["Chairperson"] })], "meeting-a")).toMatchObject({ status: "not_expected", missingRoles: ["Chairperson"] });
  });
});
