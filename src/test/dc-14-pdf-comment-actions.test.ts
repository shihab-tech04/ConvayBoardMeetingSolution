import { describe, expect, it, vi } from "vitest";
import { matchesPdfCommentFilter, savePdfCommentWithAudit } from "../app/components/documents/pdf/pdfCommentActions";

const myOpen = { document_id: "doc-1", status: "open", created_by: "Alice" };
const myResolved = { document_id: "doc-1", status: "resolved", created_by: "Alice" };
const otherOpen = { document_id: "doc-1", status: "open", created_by: "Bob" };

describe("DC-14 PDF comment filter and save", () => {
  it("shows only unresolved threads in Open", () => {
    expect(matchesPdfCommentFilter(myOpen, "doc-1", "open", "Alice")).toBe(true);
    expect(matchesPdfCommentFilter(myResolved, "doc-1", "open", "Alice")).toBe(false);
  });
  it("filters Mine to the current author without leaking other document threads", () => {
    expect(matchesPdfCommentFilter(myResolved, "doc-1", "mine", "Alice")).toBe(true);
    expect(matchesPdfCommentFilter(otherOpen, "doc-1", "mine", "Alice")).toBe(false);
    expect(matchesPdfCommentFilter(myOpen, "other", "mine", "Alice")).toBe(false);
  });
  it("fails closed for Mine when author is not available", () => {
    expect(matchesPdfCommentFilter(myOpen, "doc-1", "mine", " ")).toBe(false);
  });
  it("never creates audit evidence after a failed comment save", async () => {
    const audit = vi.fn();
    const result = await savePdfCommentWithAudit(async () => false, audit);
    expect(result).toEqual({ commentSaved: false, auditSaved: false });
    expect(audit).not.toHaveBeenCalled();
  });
  it("reports confirmed comment and audit writes", async () => {
    expect(await savePdfCommentWithAudit(async () => true, async () => true))
      .toEqual({ commentSaved: true, auditSaved: true });
  });
  it("does not falsely report audit success if the audit write fails", async () => {
    expect(await savePdfCommentWithAudit(async () => true, async () => false))
      .toEqual({ commentSaved: true, auditSaved: false });
    expect(await savePdfCommentWithAudit(async () => true, async () => { throw new Error("audit denied"); }))
      .toEqual({ commentSaved: true, auditSaved: false });
  });
  it("propagates a thrown comment-write error for the calling UI", async () => {
    await expect(savePdfCommentWithAudit(async () => { throw new Error("RLS denied"); }, async () => true))
      .rejects.toThrow("RLS denied");
  });
});
