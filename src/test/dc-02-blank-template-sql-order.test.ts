import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { persistAuthoredDocument, type AuthoredDocumentCheckpoint } from "../app/components/documents/documentUploadPersistence";

const state = (): AuthoredDocumentCheckpoint => ({
  documentId: "DOC-2026-0456", metadataSaved: false, editorSaved: false, versionSaved: false,
});
const callbacks = (log:string[]) => ({
  createMetadata: vi.fn(async()=>{log.push("metadata");return true;}),
  saveEditor: vi.fn(async()=>{log.push("editor");return "editor:DOC-2026-0456:live";}),
  createVersion: vi.fn(async()=>{log.push("version");return true;}),
});

describe("DC-02/18 blank and template document creation — SQL RLS ordering", () => {
  it("stores SQL metadata before any editor content, then confirms version", async () => {
    const order:string[]=[];const checkpoint=state();
    await expect(persistAuthoredDocument(checkpoint,callbacks(order))).resolves.toBe(checkpoint.documentId);
    expect(order).toEqual(["metadata","editor","version"]);
  });
  it("never writes editor bytes after denied SQL metadata", async () => {
    const log:string[]=[];const c=callbacks(log);c.createMetadata=vi.fn(async()=>false);
    await expect(persistAuthoredDocument(state(),c)).rejects.toThrow(/metadata.*SQL/);
    expect(log).toEqual([]);
    expect(c.saveEditor).not.toHaveBeenCalled();
  });
  it("denies malformed editor content acknowledgement before writing a version", async () => {
    const log:string[]=[];const c=callbacks(log);
    c.saveEditor=vi.fn(async()=>"editor:another-document:live");
    const st=state();await expect(persistAuthoredDocument(st,c)).rejects.toThrow(/editor content.*SQL/);
    expect(st.metadataSaved).toBe(true);
    expect(st.editorSaved).toBe(false);
    expect(c.createVersion).not.toHaveBeenCalled();
  });
  it("resumes an interrupted editor save without creating metadata twice", async () => {
    const log:string[]=[];const c=callbacks(log);let failed=true;
    c.saveEditor=vi.fn(async()=>{log.push("editor");if(failed){failed=false;throw new Error("retry");}return "editor:DOC-2026-0456:live";});
    const st=state();await expect(persistAuthoredDocument(st,c)).rejects.toThrow("retry");
    await expect(persistAuthoredDocument(st,c)).resolves.toBe(st.documentId);
    expect(log).toEqual(["metadata","editor","editor","version"]);
    expect(c.createMetadata).toHaveBeenCalledOnce();
  });
  it("resumes a denied version write without reuploading editor bytes", async () => {
    const log:string[]=[];const c=callbacks(log);let n=0;
    c.createVersion=vi.fn(async()=>{log.push("version");return ++n===2;});
    const st=state();await expect(persistAuthoredDocument(st,c)).rejects.toThrow(/version.*SQL/);
    await persistAuthoredDocument(st,c);
    expect(log).toEqual(["metadata","editor","version","version"]);
    expect(c.saveEditor).toHaveBeenCalledOnce();
  });
  it("blocks invalid ID and does not issue any writes", async () => {
    const c=callbacks([]);await expect(persistAuthoredDocument({...state(),documentId:""},c)).rejects.toThrow(/valid document ID/);
    expect(c.createMetadata).not.toHaveBeenCalled();
  });
  it("the actual composer calls this SQL-first adapter for blank and template", () => {
    const src=readFileSync("src/app/components/documents/DocumentComposerModal.tsx","utf8");
    expect((src.match(/persistAuthoredDocument\(/g) ?? [])).toHaveLength(1);
    expect(src).toContain('createAuthoredDocument("blank"');
    expect(src).toContain('createAuthoredDocument("template"');
    expect(src).not.toContain("await documentContentStore.putEditorContent(docId, resolved);\n      registry.add(");
    expect(src).not.toContain("await documentContentStore.putEditorContent(docId, JSON.stringify({ type: \"doc\", content: [] }));\n      registry.add(");
  });
});
