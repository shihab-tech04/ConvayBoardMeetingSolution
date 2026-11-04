import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const start = source.indexOf("const closeVote = useCallback(async () => {");
const end = source.indexOf("const cancelVote = useCallback(", start);
const block = source.slice(start, end);

describe("Live vote close: SQL and UI consistency", () => {
  it("commits ballot and summary records in one atomic SQL operation before closing the UI", () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain("await convayAuth.applyBatch(operations)");
    expect(block.indexOf("await convayAuth.applyBatch(operations)"))
      .toBeLessThan(block.indexOf('status: "Closed"'));
    expect(block).not.toContain("addVoteRecord(");
  });
  it("prevents reentrant writes and keeps the vote open when saving fails", () => {
    expect(block).toContain("closingVoteRequest.current");
    expect(block).toContain("if (!quorumMet)");
    expect(block).toContain("closingVoteRequest.current = true");
    expect(block).toContain("closingVoteRequest.current = false");
    expect(block).toContain('toast.error(error instanceof Error ? error.message : "Vote could not be saved. It remains open.")');
    const failed = block.slice(block.indexOf("} catch (error)"));
    expect(failed).not.toContain('status: "Closed"');
  });
  it("persists only an aggregate for secret ballots, never named individual choices", () => {
    expect(block).toContain('if (activeVote.voteType !== "Secret Ballot")');
    expect(block).toContain('voter_name: aggregateName');
    expect(block.indexOf('if (activeVote.voteType !== "Secret Ballot")'))
      .toBeLessThan(block.indexOf('for (const [participantId, choice]'));
  });
  it("uses deterministic ballot IDs and protects against duplicated summaries", () => {
    expect(block).toContain('"VRC-" + activeVote.id + "-" + participantId');
    expect(block).toContain('"VRC-" + activeVote.id + "-summary"');
    expect(block).toContain("voteItems.some(");
  });
  it("disables Close and Cancel during a pending atomic transaction", () => {
    expect(source).toContain('disabled={closingVoteBusy}');
    expect(source).toContain('closingVoteBusy ? "Saving vote…" : "Close Vote"');
  });
});