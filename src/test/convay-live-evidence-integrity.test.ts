import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getAgendaDescription } from "../app/utils/agendaDescription";

const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");

describe("Convay meeting evidence integrity", () => {
  it("prefers the actual submitted agenda description", () => {
    expect(getAgendaDescription({ title: "Budget approval", purpose: "For approval", description: "Actual board paper description" }))
      .toBe("Actual board paper description");
  });

  it("does not fabricate financial outcomes when an agenda has no description", () => {
    const result = getAgendaDescription({ title: "Capital Expenditure Approval — Q3", purpose: "For approval" });
    expect(result).toContain("supporting documents");
    expect(result).not.toContain("50,000,000");
    expect(result).not.toContain("Q3 IT capital");
    expect(result).not.toContain("The Board formally");
  });

  it("shows a useful missing-description message rather than inventing a meeting record", () => {
    expect(getAgendaDescription({ title: "Unspecified", description: " " }))
      .toContain("No description has been provided");
  });

  it("does not seed participants' comments, votes, motions or impersonated narratives on mount", () => {
    expect(workspace).not.toContain("SEED_COMMENTS");
    expect(workspace).not.toContain('id: "ac-001"');
    expect(workspace).not.toContain('id: "aim-001"');
    expect(workspace).not.toContain('Ms. Nasrin Sultana');
    expect(workspace).toContain("setAgendaItemMotions] = useState<LiveMotion[]>([])");
    expect(workspace).toContain("setAgendaMotionVotes] = useState<Record<string, Record<string, \\"For\\" | \\"Against\\" | \\"Abstain\\">>>({})");
    expect(workspace).not.toContain("SEED_MOTIONS");
    expect(workspace).not.toContain("AGENDA_DESC_FALLBACK");
    expect(workspace).not.toContain('label="More" onClick={() => {}}');
  });

  it("opens the existing live right-hand panel when More is selected", () => {
    expect(workspace).toContain('label="More" onClick={() => setPanelOpen(open => !open)}');
  });
});
