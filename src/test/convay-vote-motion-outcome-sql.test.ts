import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const start = source.indexOf("const closeVote = useCallback(async () => {");
const end = source.indexOf("const cancelVote = useCallback(", start);
const closeVote = source.slice(start, end);

describe("VT-12/VT-13: official vote and motion outcomes stay synchronized", () => {
  it("rejects closing a vote linked to an unavailable SQL motion", () => {
    expect(start).toBeGreaterThan(-1);
    expect(closeVote).toContain("const storedMotion = activeVote.motionId");
    expect(closeVote).toContain("activeVote.motionId && !storedMotion");
    expect(closeVote).toContain("linked motion is not available in SQL");
  });
  it("updates the motion register in the same atomic transaction as vote records", () => {
    expect(closeVote).toContain('entity_key: "bms.motions", action: "update"');
    expect(closeVote).toContain('status: result === "Passed" ? "Passed" : "Rejected"');
    expect(closeVote).toContain("votes_for: String(activeVote.votesFor)");
    expect(closeVote).toContain("votes_against: String(activeVote.votesAgainst)");
    const motionWrite = closeVote.indexOf('entity_key: "bms.motions", action: "update"');
    const commit = closeVote.indexOf("await convayAuth.applyBatch(operations)");
    const uiChange = closeVote.indexOf('status: "Closed"');
    expect(motionWrite).toBeGreaterThan(-1);
    expect(motionWrite).toBeLessThan(commit);
    expect(commit).toBeLessThan(uiChange);
  });
  it("reloads vote and motion registries only after the committed outcome", () => {
    expect(closeVote).toContain("await Promise.all([refreshVoteRecords?.(), refreshMotionRecords?.()])");
    expect(closeVote.indexOf("await convayAuth.applyBatch(operations)"))
      .toBeLessThan(closeVote.indexOf("await Promise.all("));
  });
  it("does not allow a participant to forge passed or rejected motions with UI-only shortcuts", () => {
    expect(source).not.toContain('setMotions(prev => prev.map(x => x.id === m.id ? { ...x, status: "Passed" }');
    expect(source).not.toContain('setMotions(prev => prev.map(x => x.id === m.id ? { ...x, status: "Rejected" }');
    expect(source).not.toContain('setAgendaItemMotions(p => p.map(x => x.id === m.id ? { ...x, status: "Passed" }');
    expect(source).not.toContain('setAgendaItemMotions(p => p.map(x => x.id === m.id ? { ...x, status: "Rejected" }');
  });
  it("leaves the official motion status uncommitted on SQL failure", () => {
    const failure = closeVote.slice(closeVote.indexOf("} catch (error) {"));
    expect(failure).not.toContain('status: result === "Passed"');
    expect(failure).not.toContain('status: "Closed"');
    expect(failure).toContain("It remains open.");
  });
});
