import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const code = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx","utf8");
describe("Live meeting canonical voter identity and eligibility", () => {
  it("unlinked users do not silently inherit a Board Member role", () => {
    expect(code).toContain('return "Observer";\n  })();');
  });
  it("uses current authenticated user's ID rather than an artificial self voter", () => {
    expect(code).toContain('castVote(currentUser.id, choice)');
    expect(code).not.toContain('castVote("self", choice)');
    expect(code).toContain('activeVote.castVotes[currentUser.id]');
  });
  it("checks canonical meeting membership, attendance and agenda recusals for each ballot", () => {
    const eligible = code.slice(code.indexOf("const isVotingEligible = useCallback"), code.indexOf("const canCastOwnBallot"));
    expect(eligible).toContain('meetingLinks.some(link => link.user_id === participantId && link.voting_eligible)');
    expect(eligible).toContain("ACTIVE_STATES.includes(status)");
    expect(eligible).toContain("(agendaRecusals[agendaKey] ?? []).includes(participantId)");
    const handler = code.slice(code.indexOf("const castVote = useCallback"),code.indexOf("// A vote becomes official"));
    expect(handler).toContain('participantId === "self" || !isVotingEligible(participantId)');
    expect(handler).toContain('participantId === currentUser.id ? !canCastOwnBallot : !canManageVotes');
  });
  it("rejects stale or revoked ballots before atomic SQL close", () => {
    const block = code.slice(code.indexOf("const closeVote = useCallback"),code.indexOf("const cancelVote = useCallback"));
    expect(block).toContain("const allBallotsEligible");
    expect(block).toContain('participantId !== "self"');
    expect(block.indexOf("if (!allBallotsEligible)")).toBeLessThan(block.indexOf("await convayAuth.applyBatch("));
  });
  it("requires canonical voter links for the voter UI and pending count", () => {
    expect(code).toContain('const canCastOwnBallot = hasGrant("mtg_join") && canVote(myRole)');
    expect(code).toContain("isVotingEligible(currentUser.id)");
    expect(code).toContain('{canCastOwnBallot && activeVote.voteType !== "Secret Ballot" && (');
    expect(code).toContain("votingEligibleIds.has(p.id)");
    expect(code).toContain("[...votingEligibleIds].filter(id => !activeVote.castVotes[id])");
    expect(code).not.toContain("useFallbackVoting");
  });
});
