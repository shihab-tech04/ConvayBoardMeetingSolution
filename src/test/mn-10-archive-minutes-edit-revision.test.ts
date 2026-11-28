import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { persistMinutesReviewTransition } from "../app/pages/archive-reports/minutesReviewPersistence";

const original = { id: "r", minutes_id: "M-1", meeting_id: "MT-1", version: "1.0", approval_status: "Draft", discussion_summary: "Original", quorum_statement: "Met" };
const selection = { ...original, source_revision: 7 };
const patch = () => ({ approval_status: "Draft", discussion_summary: "Edited" });
function gateway(revision = 7, mode = "normal") {
  let rows = [{ payload: { ...original }, revision }];
  let count = 0;
  return { get count() { return count; }, assertCurrent() {}, list: async () => rows,
    async update(record: typeof original, expected: number) {
      count++;
      if (expected !== revision) throw Error("stale");
      rows = [{ payload: mode === "wrong-content" ? { ...record, discussion_summary: "Other" } : record, revision: revision + 1 }];
      if (mode === "lost-ack") throw Error("lost acknowledgement");
      return revision + 1;
    } };
}
describe("MN-10 archive discussion editor revision binding", () => {
  it("persists exact selected edit without replacing quorum evidence", async () => {
    const g = gateway();
    expect(await persistMinutesReviewTransition(selection, patch, g)).toMatchObject({ discussion_summary: "Edited", quorum_statement: "Met" });
    expect(g.count).toBe(1);
  });
  it("rejects stale revisions before any mutation", async () => {
    const g = gateway(8);
    await expect(persistMinutesReviewTransition(selection, patch, g)).rejects.toThrow(/changed/);
    expect(g.count).toBe(0);
  });
  it("requires exact persisted discussion content", async () => {
    const g = gateway(7, "wrong-content");
    await expect(persistMinutesReviewTransition(selection, patch, g)).rejects.toThrow(/verified/);
    expect(g.count).toBe(1);
  });
  it("does not duplicate a write after ambiguous acknowledgement", async () => {
    const g = gateway(7, "lost-ack");
    await expect(persistMinutesReviewTransition(selection, patch, g)).rejects.toThrow(/lost acknowledgement/);
    expect(g.count).toBe(1);
  });
  it("pins revision when opening the editor and does not use a generic queued update", () => {
    const page = readFileSync("src/app/pages/archive-reports/MeetingRecordPage.tsx", "utf8");
    expect(page).toContain("setEditSelection({ ...m, source_revision: revision, accessSnapshot: authorization })");
    expect(page).toContain("defaultValue={editSelection.discussion_summary");
    expect(page).toContain("persistMinutesReviewTransition<Minutes>(selection");
    expect(page).not.toContain("minutesReg.update(m.id, { discussion_summary:");
    expect(page).toContain('window.addEventListener("convay:entity-cache-cleared", invalidate)');
  });
});
