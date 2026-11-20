import { describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import {
  parseAuthorizedBoardPackManifest,
  prepareAuthorizedBoardPackDownload,
  type BoardPackDownloadGateway,
} from "../app/pages/agenda-documents/boardPackDownloadGateway";

const NOW = Date.parse("2026-11-20T00:00:00.000Z");
const manifest = () => ({
  packId: "pack-1", manifestId: "manifest-revision-7", approvalStatus: "Published",
  frozenRevision: 7, expiresAt: new Date(NOW + 60_000).toISOString(),
  files: [{documentId: "doc-1", versionId: "v2", fileName: "Board paper.pdf", sizeBytes: 14}],
});
const gateway = (): BoardPackDownloadGateway => ({
  requestManifest: vi.fn(async () => manifest()),
  loadOriginal: vi.fn(async () => new Blob(["original bytes"], {type: "application/pdf"})),
  confirmReceipt: vi.fn(async () => ({
    receiptId: "audited-actor-receipt", packId: "pack-1", manifestId: "manifest-revision-7",
  })),
  now: () => NOW,
});

describe("DC-25: server-authorized board-pack download gateway", () => {
  it("accepts an exact frozen published manifest", () => {
    expect(parseAuthorizedBoardPackManifest(manifest(), "pack-1", NOW).files).toHaveLength(1);
  });
  it("rejects pack confusion, drafts and unfrozen revisions", () => {
    expect(() => parseAuthorizedBoardPackManifest(manifest(), "another", NOW)).toThrow();
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),approvalStatus:"Approved"}, "pack-1", NOW)).toThrow();
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),frozenRevision:0}, "pack-1", NOW)).toThrow();
  });
  it("rejects expired, invalid and empty manifests", () => {
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),expiresAt:new Date(NOW-1).toISOString()},"pack-1",NOW)).toThrow();
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),files:[]},"pack-1",NOW)).toThrow();
    expect(() => parseAuthorizedBoardPackManifest(null,"pack-1",NOW)).toThrow();
  });
  it("rejects duplicate exact versions and invalid document identities", () => {
    const file = manifest().files[0];
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),files:[file,file]},"pack-1",NOW)).toThrow();
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),files:[{...file,versionId:""}]},"pack-1",NOW)).toThrow();
  });
  it("creates an archive only after the authoritative receipt is confirmed", async () => {
    const g = gateway();
    const download = await prepareAuthorizedBoardPackDownload("pack-1",g);
    expect(download.archive.size).toBeGreaterThan(20);
    expect(download.receiptId).toBe("audited-actor-receipt");
    expect(download.fileName).toBe("pack-1.zip");
    expect(g.loadOriginal).toHaveBeenCalledWith("doc-1","v2");
    expect(g.confirmReceipt).toHaveBeenCalledWith("pack-1","manifest-revision-7");
  });
  it("fails closed on missing original; no receipt is created", async () => {
    const g = gateway(); g.loadOriginal = vi.fn(async()=>null);
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g)).rejects.toThrow();
    expect(g.confirmReceipt).not.toHaveBeenCalled();
  });
  it("rejects an audit denial and mismatched receipt", async () => {
    const g = gateway();g.confirmReceipt = vi.fn(async()=>{throw new Error("revoked")});
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g)).rejects.toThrow("revoked");
    const bad = gateway();bad.confirmReceipt = vi.fn(async()=>({receiptId:"receipt",packId:"foreign",manifestId:"manifest-revision-7"}));
    await expect(prepareAuthorizedBoardPackDownload("pack-1",bad)).rejects.toThrow();
  });
  it("rejects cancellation before any manifest request", async () => {
    const g = gateway();const c = new AbortController();c.abort();
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g,c.signal)).rejects.toMatchObject({name:"AbortError"});
    expect(g.requestManifest).not.toHaveBeenCalled();
  });
  it("rejects cancellation after fetching the original and avoids audit", async () => {
    const g = gateway();const c = new AbortController();
    g.loadOriginal = vi.fn(async()=>{c.abort();return new Blob(["secret"])});
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g,c.signal)).rejects.toMatchObject({name:"AbortError"});
    expect(g.confirmReceipt).not.toHaveBeenCalled();
  });
  it("rejects expiry during source retrieval and before receipt", async () => {
    const g = gateway();let t=NOW;g.now=()=>t;
    g.loadOriginal = vi.fn(async()=>{t=NOW+61_000;return new Blob(["original bytes"])});
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g)).rejects.toThrow(/expired/i);
    expect(g.confirmReceipt).not.toHaveBeenCalled();
  });
  it("denies an oversized original before ZIP creation", async () => {
    const g=gateway(); g.loadOriginal=vi.fn(async()=>{ const file = new Blob(["x"]); Object.defineProperty(file, "size", {value: 100*1024*1024+1}); return file; });
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g)).rejects.toThrow(/size/i);
    expect(g.confirmReceipt).not.toHaveBeenCalled();
  });
  it("requires server-recorded exact original byte sizes and rejects malformed digests", () => {
    const original = manifest().files[0];
    expect(() => parseAuthorizedBoardPackManifest({...manifest(), files:[{...original, sizeBytes:-1}]},"pack-1",NOW)).toThrow(/integrity metadata/i);
    expect(() => parseAuthorizedBoardPackManifest({...manifest(), files:[{...original, sizeBytes:1.5}]},"pack-1",NOW)).toThrow(/integrity metadata/i);
    expect(() => parseAuthorizedBoardPackManifest({...manifest(), files:[{...original, sizeBytes:undefined}]},"pack-1",NOW)).toThrow(/integrity metadata/i);
    expect(() => parseAuthorizedBoardPackManifest({...manifest(), files:[{...original, sha256:"forged"}]},"pack-1",NOW)).toThrow(/integrity metadata/i);
  });
  it("rejects control characters and noncanonical identifiers", () => {
    const original = manifest().files[0];
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),files:[{...original,documentId:"doc\u0000id"}]},"pack-1",NOW)).toThrow();
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),files:[{...original,versionId:" v2 "}]},"pack-1",NOW)).toThrow();
    expect(() => parseAuthorizedBoardPackManifest({...manifest(),manifestId:"m\n1"},"pack-1",NOW)).toThrow();
  });
  it("fails closed on original size mismatch without recording a receipt", async () => {
    const g=gateway();g.loadOriginal=vi.fn(async()=>new Blob(["different-sized body"]));
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g)).rejects.toThrow(/size does not match/i);
    expect(g.confirmReceipt).not.toHaveBeenCalled();
  });
  it("verifies an authentic SHA-256 digest before confirming the receipt", async () => {
    const g=gateway();
    vi.stubGlobal("crypto", webcrypto);
    try {
      g.requestManifest=vi.fn(async()=>({
        ...manifest(),
        files:[{...manifest().files[0],
          sha256:"52c3935626c104b2cbc9031291a1c4d56614c38f52072a361d658a58a9c48698"}],
      }));
      const download=await prepareAuthorizedBoardPackDownload("pack-1",g);
      expect(download.receiptId).toBe("audited-actor-receipt");
      expect(download.archive.size).toBeGreaterThan(0);
      expect(g.confirmReceipt).toHaveBeenCalledTimes(1);
    } finally {vi.unstubAllGlobals();}
  });
  it("fails closed on an original hash mismatch without recording a receipt", async () => {
    const g=gateway();g.requestManifest=vi.fn(async()=>({
      ...manifest(), files:[{...manifest().files[0],sha256:"0".repeat(64)}],
    }));
    await expect(prepareAuthorizedBoardPackDownload("pack-1",g)).rejects.toThrow(/checksum mismatch|integrity cannot be verified/i);
    expect(g.confirmReceipt).not.toHaveBeenCalled();
  });

});
