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
    const block = code.slice(code.indexOf("const castVote = useCallback"),code.indexOf("// A vote becomes official"));
    expect(block).toContain('meetingLinks.find(l => l.user_id === participantId)');
    expect(block).toContain("link?.voting_eligible === true");
    expect(block).toContain("ACTIVE_STATES.includes(status)");
    expect(block).toContain("!recused.includes(participantId)");
    expect(block).toContain('participantId !== currentUser.id && !canRecordMeeting');
  });
  it("rejects stale or revoked ballots before atomic SQL close", () => {
    const block = code.slice(code.indexOf("const closeVote = useCallback"),code.indexOf("const cancelVote = useCallback"));
    expect(block).toContain("const allBallotsEligible");
    expect(block).toContain('participantId !== "self"');
    expect(block.indexOf("if (!allBallotsEligible)")).toBeLessThan(block.indexOf("await convayAuth.applyBatch("));
  });
  it("requires canonical voter links for the voter UI and pending count", () => {
    expect(code).toContain("votingEligibleIds.has(currentUser.id)");
    expect(code).toContain("votingEligibleIds.has(p.id)");
    expect(code).toContain("[...votingEligibleIds].filter(id => !activeVote.castVotes[id])");
    expect(code).not.toContain("useFallbackVoting");
  });
});
