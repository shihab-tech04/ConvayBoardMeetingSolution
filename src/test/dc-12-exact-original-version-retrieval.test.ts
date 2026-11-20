import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("../app/services/repositories/documentContentStore", () => ({
  documentContentStore: { getOriginalFile: vi.fn() },
}));

import { documentContentStore } from "../app/services/repositories/documentContentStore";
import { resolveDocumentFile } from "../app/components/documents/documentSource";

const loader = vi.mocked(documentContentStore.getOriginalFile);
const fixture = { name: "version-v2.pdf" } as File;

beforeEach(() => vi.clearAllMocks());

describe("DC-12/25 exact version-bound document file resolution", () => {
  it("requests the exact version specified in a stored source", async () => {
    loader.mockResolvedValueOnce(fixture);
    await expect(resolveDocumentFile({ kind: "stored", documentId: "DOC-001", versionId: "DV-002" })).resolves.toBe(fixture);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith("DOC-001", "DV-002");
  });

  it("rejects unavailable historical versions, without retrying with mutable latest", async () => {
    loader.mockResolvedValueOnce(null);
    await expect(resolveDocumentFile({ kind: "stored", documentId: "DOC-001", versionId: "DV-OLD" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith("DOC-001", "DV-OLD");
  });

  it("retains existing current-original behavior when no version was requested", async () => {
    loader.mockResolvedValueOnce(fixture);
    await expect(resolveDocumentFile({ kind: "stored", documentId: "DOC-001" })).resolves.toBe(fixture);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith("DOC-001", undefined);
  });

  it("never requests someone else's document/version as fallback", async () => {
    loader.mockResolvedValueOnce(null);
    await expect(resolveDocumentFile({ kind: "stored", documentId: "DOC-A", versionId: "DV-A" })).rejects.toThrow("File not found");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).not.toHaveBeenCalledWith("DOC-A", undefined);
  });

  it("leaves nonstored File sources unaffected", async () => {
    await expect(resolveDocumentFile({ kind: "file", file: fixture })).resolves.toBe(fixture);
    expect(loader).not.toHaveBeenCalled();
  });

  it("wires version identity into unsupported-format download too", () => {
    const content = readFileSync("src/app/components/documents/UnifiedDocumentViewer.tsx", "utf8");
    expect(content).toContain('versionId={source.kind === "stored" ? source.versionId : undefined}');
    expect(content).toContain('documentId={source.kind === "stored" ? source.documentId : documentId}');
    expect(content).toContain("getOriginalFile(documentId, versionId)");
    expect(content).not.toContain("getOriginalFile(documentId);");
  });

  it("keeps exact-version resolver wiring for all format workspaces", () => {
    const source = readFileSync("src/app/components/documents/documentSource.ts", "utf8");
    expect(source).toContain("getOriginalFile(source.documentId, source.versionId)");
    expect(source).not.toContain("getOriginalFile(source.documentId);");
  });
});
