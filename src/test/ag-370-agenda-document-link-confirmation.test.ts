import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { requireAgendaDocumentLinkAck } from "../app/components/agenda/agendaDocumentLinkConfirmation";

describe("AG-370 SQL-confirmed Agenda document attachments", () => {
  it("does not confirm an attachment before its asynchronous SQL write resolves", async () => {
    let ack!: (value: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>(resolve => { ack = resolve; }));
    let completed = false;
    const pending = requireAgendaDocumentLinkAck("DOC-1", "AGD-1", save).then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(save).toHaveBeenCalledExactlyOnceWith("DOC-1", "AGD-1");
    ack(true);
    await expect(pending).resolves.toBeUndefined();
    expect(completed).toBe(true);
  });

  it("rejects a missing or denied SQL confirmation and preserves document ID for retry", async () => {
    await expect(requireAgendaDocumentLinkAck("DOC-1", "AGD-1", async () => false))
      .rejects.toThrow("not confirmed in SQL");
    await expect(requireAgendaDocumentLinkAck("DOC-1", "AGD-1", async () =>
      undefined as unknown as boolean)).rejects.toThrow("not confirmed in SQL");
    await expect(requireAgendaDocumentLinkAck("DOC-1", "AGD-1", async () => {
      throw new Error("SQL permission denied");
    })).rejects.toThrow("SQL permission denied");
    const save = vi.fn(async () => true);
    await expect(requireAgendaDocumentLinkAck("DOC-1", null, save))
      .rejects.toThrow("destination is no longer available");
    expect(save).not.toHaveBeenCalled();
  });

  it("wires actual upload/create callback to awaited ACK and the existing recovery UI", () => {
    const agenda = readFileSync("src/app/components/agenda/AgendaFormModal.tsx", "utf8");
    const composer = readFileSync("src/app/components/documents/DocumentComposerModal.tsx", "utf8");
    expect(agenda).toContain("onCreated={async docId => {");
    expect(agenda).toContain("await requireAgendaDocumentLinkAck(docId, cid, (documentId, agendaId) =>");
    expect(agenda).toContain("linkDoc(documentId, agendaId, false)");
    expect(agenda).toContain("return true;");
    expect(agenda).toContain("return false;");
    expect(agenda).toContain("await linkReg.refresh?.()");
    expect(agenda).not.toContain("if (cid) linkDoc(docId, cid)");
    expect(composer).toContain("await onCreated?.(confirmedId)");
    expect(composer).toContain("its agenda link was not confirmed");
  });
});
