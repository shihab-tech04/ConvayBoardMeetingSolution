import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { requireDocumentCommentAck } from "../app/pages/agenda-documents/documentCommentAck";

describe("DC-14 document editor comment SQL acknowledgements", () => {
  it("allows a confirmed comment creation", async () => {
    const write=vi.fn(async()=>true);
    await expect(requireDocumentCommentAck(write,"post")).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledOnce();
  });
  it("allows a confirmed comment resolution", async () => {
    await expect(requireDocumentCommentAck(()=>true,"resolve")).resolves.toBeUndefined();
  });
  it("denies a rejected or expired-session comment creation", async () => {
    await expect(requireDocumentCommentAck(async()=>false,"post")).rejects.toThrow(/Comment was not confirmed/);
  });
  it("denies an undefined SQL result", async () => {
    await expect(requireDocumentCommentAck(async()=>undefined as unknown as boolean,"post")).rejects.toThrow(/not confirmed/);
  });
  it("denies a rejected comment resolution", async () => {
    await expect(requireDocumentCommentAck(()=>false,"resolve")).rejects.toThrow(/Resolution was not confirmed/);
  });
  it("preserves thrown network/database errors", async () => {
    await expect(requireDocumentCommentAck(async()=>{throw new Error("Network denied");},"post")).rejects.toThrow("Network denied");
  });
  it("wires SQL acknowledgements into both editor comment operations without fabricated audit writes", () => {
    const src=readFileSync("src/app/pages/agenda-documents/DocumentEditorPage.tsx","utf8");
    const comment=src.split("function RightPanelComments(")[1]?.split("// ── Right Panel:")[0] ?? "";
    expect(comment).toContain("await requireDocumentCommentAck(() => threadReg.add(");
    expect(comment).toContain("await requireDocumentCommentAck(\n        () => threadReg.update(");
    expect(comment).not.toContain("auditReg.add(");
    expect(comment).toContain("pendingPost.current = pending");
    expect(comment).toContain("loading={posting}");
    expect(comment).toContain("disabled={resolvingId !== null}");
  });
});
