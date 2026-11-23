import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { persistUploadedDocument, type DocumentUploadCheckpoint } from "../app/components/documents/documentUploadPersistence";

const state = (): DocumentUploadCheckpoint => ({
  documentId: "DOC-2026-0123", metadataSaved: false,
  originalSaved: false, versionSaved: false,
});

function writes(log: string[], overrides: Partial<{
  metadata: () => Promise<boolean>, original: () => Promise<string>, version: () => Promise<boolean>,
}> = {}) {
  return {
    createMetadata: vi.fn(overrides.metadata ?? (async () => {log.push("metadata");return true;})),
    saveOriginal: vi.fn(overrides.original ?? (async () => {log.push("original");return "file:DOC-2026-0123:latest";})),
    createVersion: vi.fn(overrides.version ?? (async () => {log.push("version");return true;})),
  };
}

describe("DC-02 private Storage upload must follow SQL document creation", () => {
  it("performs metadata -> private original -> version, never pre-authorized upload", async () => {
    const log: string[] = [];const s=state();const w=writes(log);
    await expect(persistUploadedDocument(s,w)).resolves.toBe("DOC-2026-0123");
    expect(log).toEqual(["metadata", "original", "version"]);
    expect(s).toEqual({documentId:"DOC-2026-0123",metadataSaved:true,originalSaved:true,versionSaved:true});
  });
  it("fails closed on SQL denial before any file storage", async () => {
    const s=state();const w=writes([], {metadata:async()=>false});
    await expect(persistUploadedDocument(s,w)).rejects.toThrow(/metadata.*SQL/i);
    expect(w.saveOriginal).not.toHaveBeenCalled();
    expect(w.createVersion).not.toHaveBeenCalled();
    expect(s.metadataSaved).toBe(false);
  });
  it("fails closed for undefined or delayed SQL acknowledgement", async () => {
    const s=state();const w=writes([], {metadata:async() => undefined as unknown as boolean});
    await expect(persistUploadedDocument(s,w)).rejects.toThrow(/metadata.*SQL/i);
    expect(w.saveOriginal).not.toHaveBeenCalled();
  });
  it("preserves document ID and retries only the denied original stage", async () => {
    const s=state();let failed=true;const order:string[]=[];
    const w=writes(order,{original:async()=>{order.push("original");if(failed){failed=false;throw new Error("storage denied");}return "file:DOC-2026-0123:latest";}});
    await expect(persistUploadedDocument(s,w)).rejects.toThrow("storage denied");
    expect(order).toEqual(["metadata","original"]);
    expect(s).toMatchObject({metadataSaved:true,originalSaved:false,versionSaved:false});
    await expect(persistUploadedDocument(s,w)).resolves.toBe(s.documentId);
    expect(order).toEqual(["metadata","original","original","version"]);
    expect(w.createMetadata).toHaveBeenCalledTimes(1);
  });
  it("rejects wrong private-content acknowledgement without versioning", async () => {
    const s=state();const w=writes([], {original:async()=>"file:someone-else:latest"});
    await expect(persistUploadedDocument(s,w)).rejects.toThrow(/original file was not confirmed/);
    expect(w.createVersion).not.toHaveBeenCalled();
    expect(s.originalSaved).toBe(false);
  });
  it("retries failed version stage without duplicating already stored document bytes", async () => {
    const s=state();let n=0;const order:string[]=[];
    const w=writes(order,{version:async()=>{order.push("version");return ++n===2;}});
    await expect(persistUploadedDocument(s,w)).rejects.toThrow(/version.*SQL/i);
    expect(s).toMatchObject({metadataSaved:true,originalSaved:true,versionSaved:false});
    await expect(persistUploadedDocument(s,w)).resolves.toBe(s.documentId);
    expect(order).toEqual(["metadata","original","version","version"]);
    expect(w.saveOriginal).toHaveBeenCalledOnce();
  });
  it("does not repeat confirmed writes on a reentrant completed checkpoint", async () => {
    const s=state();const w=writes([]);
    await persistUploadedDocument(s,w);await persistUploadedDocument(s,w);
    expect(w.createMetadata).toHaveBeenCalledOnce();
    expect(w.saveOriginal).toHaveBeenCalledOnce();
    expect(w.createVersion).toHaveBeenCalledOnce();
  });
  it("rejects missing ID before any SQL or Storage call", async () => {
    const s={...state(),documentId:" "};const w=writes([]);
    await expect(persistUploadedDocument(s,w)).rejects.toThrow(/valid document ID/);
    expect(w.createMetadata).not.toHaveBeenCalled();
  });
  it("is used in the actual composer and caps upload at the current private bucket limit", () => {
    const src=readFileSync("src/app/components/documents/DocumentComposerModal.tsx","utf8");
    expect(src).toContain("persistUploadedDocument(");
    expect(src).toContain("MAX_ORIGINAL_UPLOAD_MB = 15");
    expect(src).toContain("maxSizeMB={MAX_ORIGINAL_UPLOAD_MB}");
    expect(src).not.toContain("await documentContentStore.putOriginalFile(docId, file);\n      // 2. Metadata");
  });
});
