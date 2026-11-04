import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");

describe("RBAC role+permission+user controls and eligible voting", () => {
  it("requires server-reported permissions for non-Super Admin live actions", () => {
    expect(source).toContain('const canRecordMeeting = hasLeadership && hasGrant("mtg_start")');
    expect(source).toContain('hasGrant("mtg_start") && hasGrant("mtg_update")');
    expect(source).toContain('const canEditAttendance = hasLeadership && hasGrant("mtg_attendance")');
    expect(source).toContain('canManageAgenda && hasGrant("agd_submit")');
    expect(source).toContain('const canDraftMinutes = hasLeadership && hasGrant("min_create")');
    expect(source).toContain('const canManageVotes = canRecordMeeting && hasGrant("mtg_join")');
  });
  it("maintains the Super Admin full-access exception without overriding voter eligibility", () => {
    expect(source).toContain('access.is_super_admin || access.effective_permissions.includes(code)');
    expect(source).toContain('const canCastOwnBallot = hasGrant("mtg_join") && canVote(myRole)');
    expect(source).toContain('isVotingEligible(currentUser.id)');
    expect(source).not.toContain('access.is_super_admin || canVote(myRole)');
  });
  it("never falls back to generic role voting when meeting participant links are missing", () => {
    expect(source).not.toContain('useFallbackVoting');
    expect(source).toContain('meetingLinks.some(link => link.user_id === participantId && link.voting_eligible)');
    expect(source).toContain('ACTIVE_STATES.includes(status)');
    expect(source).toContain('agendaRecusals[agendaKey]');
  });
  it("guards votes in the handler against ineligible participants and unauthorized proxy votes", () => {
    expect(source).toContain('participantId === "self" || !isVotingEligible(participantId)');
    expect(source).toContain('participantId === currentUser.id ? !canCastOwnBallot : !canManageVotes');
    expect(source).toContain('Only present, eligible, non-recused participants may vote.');
  });
  it("uses the actual signed-in identity, rather than a shared self alias", () => {
    expect(source).toContain('castVote(currentUser.id, choice)');
    expect(source).toContain('activeVote.castVotes[currentUser.id]');
    expect(source).not.toContain('castVote("self", choice)');
    expect(source).not.toContain('activeVote.castVotes["self"]');
  });
  it("connects role-specific controls to proper permissions", () => {
    expect(source).toContain('canUpdate={canEditAttendance}');
    expect(source.indexOf("const linksForMeeting = allParticipantLinks.filter(")).toBeLessThan(
      source.indexOf("const fromReg = allParticipants.filter(")
    );
    expect(source).toContain("voter_id: participantId, ballot_session_id: activeVote.id");
    expect(source).toContain('ctrlStatus === "in-progress" && canCreateTemporaryAgenda && (');
    expect(source).toContain('ctrlStatus !== "not-started" && canDraftMinutes && (');
  });
});