import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { retrieveVersionOriginalForDownload } from "../app/components/documents/documentOriginalDownload";
import { validatePinnedOriginal } from "../app/services/repositories/documentOriginalIdentity";
import { supabaseDocumentContentStore } from "../app/services/repositories/supabaseDocumentContentStore";
import { convayAuth } from "../app/services/supabase/convayAuth";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));
const version = {document_id:"DOC-001",version_id:"DV-001",version_number:"1.0"};
const row = {
  id:"file:DOC-001:DV-001", document_id:"DOC-001", version_id:"DV-001", content_type:"original_file",
  storage_path:"DOC-001/DV-001/original/12345678-1234-4234-8234-123456789abc", size:3,
  file_name:"historic.pdf", mime_type:"application/pdf",
};
const file = new File(["old"], "historic.pdf", {type:"application/pdf"});
const request = vi.mocked(convayAuth.authenticatedRequest);
const metadata = (records: unknown[]) => ({json:async()=>records} as Response);
const bytes = (value: Blob) => ({blob:async()=>value} as Response);
beforeEach(()=>vi.resetAllMocks());

describe("DC-12 exact historical version download",()=>{
  it("dispatches the exact saved version, never latest",async()=>{
    const load=vi.fn(async()=>file), dispatch=vi.fn();
    await retrieveVersionOriginalForDownload("DOC-001",version,"fallback.pdf",load,()=>{},dispatch);
    expect(load).toHaveBeenCalledExactlyOnceWith("DOC-001","DV-001");
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(file,"historic.pdf");
  });
  it.each(["latest","LIVE","1.0"," DV-001","", "DV-\n001"])("rejects non-exact version %s before loading",async versionId=>{
    const load=vi.fn(), dispatch=vi.fn();
    await expect(retrieveVersionOriginalForDownload("DOC-001",{...version,version_id:versionId},"file",load,()=>{},dispatch)).rejects.toThrow(/exact historical/);
    expect(load).not.toHaveBeenCalled(); expect(dispatch).not.toHaveBeenCalled();
  });
  it("rejects a different document without loading",async()=>{
    const load=vi.fn(), dispatch=vi.fn();
    await expect(retrieveVersionOriginalForDownload("DOC-OTHER",version,"file",load,()=>{},dispatch)).rejects.toThrow();
    expect(load).not.toHaveBeenCalled(); expect(dispatch).not.toHaveBeenCalled();
  });
  it("rejects an unavailable historical file without a second request",async()=>{
    const load=vi.fn(async()=>null), dispatch=vi.fn();
    await expect(retrieveVersionOriginalForDownload("DOC-001",version,"file",load,()=>{},dispatch)).rejects.toThrow(/unavailable/);
    expect(load).toHaveBeenCalledExactlyOnceWith("DOC-001","DV-001"); expect(dispatch).not.toHaveBeenCalled();
  });
  it("withholds original bytes if selection or permission changes during retrieval",async()=>{
    let allowed=true; const dispatch=vi.fn();
    const assertCurrent=()=>{if(!allowed)throw new Error("scope changed")};
    await expect(retrieveVersionOriginalForDownload("DOC-001",version,"file",async()=>{allowed=false;return file},assertCurrent,dispatch)).rejects.toThrow(/scope changed/);
    expect(dispatch).not.toHaveBeenCalled();
  });
  it("wires the existing drawer control to the exact version handler",()=>{
    const source=readFileSync("src/app/components/documents/DocumentDetailsDrawer.tsx","utf8");
    expect(source).toContain("onClick={() => void handleVersionDownload(v)}");
    expect(source).toContain("retrieveVersionOriginalForDownload(docId, v,");
    expect(source).toContain("documentContentStore.getOriginalFile(id, versionId)");
    expect(source).toContain('documentActionSessionUnchanged("doc_download", accessAtStart, readAccessSnapshot())');
  });
});

describe("DC-12 pinned original REST/Storage contract",()=>{
  it("validates exact metadata and fetches only its version-specific object",async()=>{
    expect(()=>validatePinnedOriginal(row,"DOC-001","DV-001")).not.toThrow();
    request.mockResolvedValueOnce(metadata([row])).mockResolvedValueOnce(bytes(file));
    const result=await supabaseDocumentContentStore.getOriginalFile("DOC-001","DV-001");
    expect(result?.size).toBe(3);expect(result?.name).toBe("historic.pdf");
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith("/storage/v1/object/authenticated/convay-documents/"+row.storage_path);
  });
  it.each([
    {...row,document_id:"DOC-OTHER"}, {...row,version_id:"DV-OTHER"}, {...row,content_type:"editor_json"},
    {...row,storage_path:"DOC-001/latest/original/12345678-1234-4234-8234-123456789abc"},
    {...row,storage_path:row.storage_path+"/../other"}, {...row,size:-1},
  ])("rejects mismatched metadata before fetching Storage",async corrupt=>{
    request.mockResolvedValueOnce(metadata([corrupt]));
    await expect(supabaseDocumentContentStore.getOriginalFile("DOC-001","DV-001")).rejects.toThrow(/metadata/);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects different byte count without falling back",async()=>{
    request.mockResolvedValueOnce(metadata([row])).mockResolvedValueOnce(bytes(new Blob(["different"])));
    await expect(supabaseDocumentContentStore.getOriginalFile("DOC-001","DV-001")).rejects.toThrow(/byte count/);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("returns missing version as missing, not latest",async()=>{
    request.mockResolvedValueOnce(metadata([]));
    await expect(supabaseDocumentContentStore.getOriginalFile("DOC-001","DV-001")).resolves.toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
