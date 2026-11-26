import { describe, expect, it } from "vitest";
import { assembleBoardPackDraft, assertSameBoardPackDraftIntent, persistBoardPackDraft } from "../app/pages/agenda-documents/boardPackDraftPersistence";
import type { BoardPack } from "../app/data/boardMeetingData";

const meeting = { meeting_id: "M-1", meeting_title: "Board", committee: "Board", meeting_date: "2026-11-26" };
const values = { pack_title: "November", meeting_id: "M-1", version: "V1", include_notice: true };
const draft = assembleBoardPackDraft(values, [meeting], [], "stable-id", "Actor", new Date("2026-11-26T00:00:00Z"));

function fixture(initial: BoardPack[] = []) {
  let rows = [...initial], writes = 0, dispatched = 0, current = true;
  let behavior: "success" | "lost" | "missing" | "throw" = "success";
  const gateway = {
    list: async () => rows,
    assertCurrent: () => { if (!current) throw new Error("scope changed"); },
    create: async (item: BoardPack) => {
      writes += 1;
      if (behavior === "throw") throw new Error("network failure");
      if (behavior !== "missing") rows.push({ ...item });
      return behavior !== "lost";
    },
  };
  return { gateway, mark: () => { dispatched += 1; }, get writes() { return writes; }, get dispatched() { return dispatched; },
    setRows: (next: BoardPack[]) => { rows = next; }, setBehavior: (next: typeof behavior) => { behavior = next; }, invalidate: () => { current = false; } };
}

describe("DC-21 board-pack create: exact interrupted-intent recovery", () => {
  it("confirms a newly created draft only from exact SQL readback", async () => {
    const f = fixture();
    expect(await persistBoardPackDraft(draft, f.gateway, false, f.mark)).toEqual(draft);
    expect(f.writes).toBe(1); expect(f.dispatched).toBe(1);
  });
  it("recovers a lost ACK after commit without another insert", async () => {
    const f = fixture(); f.setBehavior("lost");
    expect(await persistBoardPackDraft(draft, f.gateway, false, f.mark)).toEqual(draft);
    expect(await persistBoardPackDraft(draft, f.gateway, true, f.mark)).toEqual(draft);
    expect(f.writes).toBe(1);
  });
  it("rejects an ACK without a saved payload then retries the same ID", async () => {
    const f = fixture(); f.setBehavior("missing");
    await expect(persistBoardPackDraft(draft, f.gateway, false, f.mark)).rejects.toThrow(/readback/);
    f.setBehavior("success");
    expect(await persistBoardPackDraft(draft, f.gateway, true, f.mark)).toEqual(draft);
    expect(f.writes).toBe(2);
  });
  it("recognizes an exact previous insert but not an undispatched identity", async () => {
    const f = fixture([draft]);
    await expect(persistBoardPackDraft(draft, f.gateway, false, f.mark)).rejects.toThrow(/already exists/);
    expect(await persistBoardPackDraft(draft, f.gateway, true, f.mark)).toEqual(draft);
    expect(f.writes).toBe(0);
  });
  it("rejects conflicting payload, duplicate ID and conflicting reference", async () => {
    for (const rows of [[{ ...draft, pack_title: "changed" }], [draft, draft], [{ ...draft, id: "other" }]]) {
      const f = fixture(rows);
      await expect(persistBoardPackDraft(draft, f.gateway, true, f.mark)).rejects.toThrow(/differs|conflicts/);
      expect(f.writes).toBe(0);
    }
  });
  it("fails closed on authority invalidation before or after dispatch", async () => {
    const f = fixture(); f.invalidate();
    await expect(persistBoardPackDraft(draft, f.gateway, false, f.mark)).rejects.toThrow(/scope changed/);
    expect(f.writes).toBe(0);
    const g = fixture(); const create = g.gateway.create;
    g.gateway.create = async item => { const ack = await create(item); g.invalidate(); return ack; };
    await expect(persistBoardPackDraft(draft, g.gateway, false, g.mark)).rejects.toThrow(/scope changed/);
    expect(g.writes).toBe(1);
  });
  it("retains the dispatch marker after a network failure and retries safely", async () => {
    const f = fixture(); f.setBehavior("throw");
    await expect(persistBoardPackDraft(draft, f.gateway, false, f.mark)).rejects.toThrow(/network failure/);
    expect(f.dispatched).toBe(1);
    f.setBehavior("success");
    expect(await persistBoardPackDraft(draft, f.gateway, true, f.mark)).toEqual(draft);
  });
  it("rejects changed form intent and ambiguous meeting identity", () => {
    assertSameBoardPackDraftIntent(values, draft, [meeting]);
    expect(() => assertSameBoardPackDraftIntent({ ...values, include_notice: false }, draft, [meeting])).toThrow(/unresolved/);
    expect(() => assembleBoardPackDraft(values, [meeting, meeting], [], "id", "Actor", new Date())).toThrow(/existing meeting/);
  });
});
