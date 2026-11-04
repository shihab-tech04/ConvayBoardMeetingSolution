import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");

const handlers = [
  ["handleMotionSubmit", "addMotionRec", "setMotionOpen"],
  ["handleDecisionSubmit", "addDecision", "setDecisionOpen"],
  ["handleResolutionSubmit", "addResolution", "setResolutionOpen"],
  ["handleActionSubmit", "addAction", "setActionOpen"],
] as const;

describe("Convay live governance record persistence", () => {
  for (const [handler, write, close] of handlers) {
    it(`${handler}: does not show success or close the form before SQL confirms`, () => {
      const start = workspace.indexOf(`const ${handler} = async`);
      expect(start).toBeGreaterThan(-1);
      const next = workspace.indexOf("\n  const ", start + 8);
      const body = workspace.slice(start, next > start ? next : undefined);
      expect(body).toContain(`const saved = await ${write}(`);
      expect(body).toContain("if (saved !== true) return;");
      expect(body.indexOf("if (saved !== true) return;")).toBeLessThan(body.indexOf(close + "(false)"));
    });
  }

  it("uses one stable motion ID in the live panel and SQL registry", () => {
    const start = workspace.indexOf("const handleMotionSubmit = async");
    const end = workspace.indexOf("const handleVoteSubmit", start);
    const body = workspace.slice(start, end);
    expect(body).toContain("const mId = motion.id;");
    expect(body).toContain("id: mId, motion_id: mId");
    expect(body.indexOf("setMotions(prev => [...prev, motion])")).toBeGreaterThan(body.indexOf("if (saved !== true) return;"));
  });
});
