/**
 * DocumentSource — resolver and helper tests.
 * Verifies the discriminated union and resolveDocumentFile behaviour.
 */
import { describe, it, expect, vi } from "vitest";
import type { DocumentSource } from "../app/components/documents/documentSource";

// Hoisted at module level so vi.mock works correctly.
vi.mock("../app/services/repositories/documentContentStore", () => ({
  documentContentStore: {
    getOriginalFile:    vi.fn().mockResolvedValue(null),
    putOriginalFile:    vi.fn(),
    getPdfAnnotations:  vi.fn().mockResolvedValue(null),
    putPdfAnnotations:  vi.fn(),
  },
}));
import {
  getSourceFileName,
  getSourceMimeType,
  resolveDocumentFile,
} from "../app/components/documents/documentSource";

// ── getSourceFileName ─────────────────────────────────────────────────────────

describe("getSourceFileName", () => {
  it("returns empty string for stored source", () => {
    const src: DocumentSource = { kind: "stored", documentId: "doc-1" };
    expect(getSourceFileName(src)).toBe("");
  });

  it("returns file.name for file source", () => {
    const file = new File([""], "report.pdf", { type: "application/pdf" });
    const src: DocumentSource = { kind: "file", file };
    expect(getSourceFileName(src)).toBe("report.pdf");
  });

  it("returns fileName for blob source", () => {
    const src: DocumentSource = { kind: "blob", blob: new Blob([""]), fileName: "export.csv", mimeType: "text/csv" };
    expect(getSourceFileName(src)).toBe("export.csv");
  });

  it("returns fileName for url source", () => {
    const src: DocumentSource = { kind: "url", url: "blob:abc", fileName: "doc.pdf", mimeType: "application/pdf" };
    expect(getSourceFileName(src)).toBe("doc.pdf");
  });
});

// ── getSourceMimeType ─────────────────────────────────────────────────────────

describe("getSourceMimeType", () => {
  it("returns empty string for stored source", () => {
    expect(getSourceMimeType({ kind: "stored", documentId: "x" })).toBe("");
  });

  it("returns file.type for file source", () => {
    const file = new File([""], "a.pdf", { type: "application/pdf" });
    expect(getSourceMimeType({ kind: "file", file })).toBe("application/pdf");
  });

  it("returns mimeType for blob source", () => {
    const src: DocumentSource = { kind: "blob", blob: new Blob([""]), fileName: "a.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    expect(getSourceMimeType(src)).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("returns mimeType for url source", () => {
    const src: DocumentSource = { kind: "url", url: "blob:x", fileName: "a.pdf", mimeType: "application/pdf" };
    expect(getSourceMimeType(src)).toBe("application/pdf");
  });
});

// ── resolveDocumentFile — file source ─────────────────────────────────────────

describe("resolveDocumentFile — file source", () => {
  it("returns the supplied File directly", async () => {
    const file = new File(["hello"], "test.pdf", { type: "application/pdf" });
    const src: DocumentSource = { kind: "file", file };
    const result = await resolveDocumentFile(src);
    expect(result).toBe(file);
    expect(result.name).toBe("test.pdf");
  });
});

// ── resolveDocumentFile — blob source ─────────────────────────────────────────

describe("resolveDocumentFile — blob source", () => {
  it("wraps the blob in a File with the given name and MIME", async () => {
    const blob = new Blob(["data"], { type: "text/csv" });
    const src: DocumentSource = { kind: "blob", blob, fileName: "export.csv", mimeType: "text/csv" };
    const result = await resolveDocumentFile(src);
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe("export.csv");
    expect(result.type).toBe("text/csv");
  });
});

// ── resolveDocumentFile — stored source (missing) ────────────────────────────

describe("resolveDocumentFile — stored source", () => {
  it("throws with code NOT_FOUND when file is absent", async () => {
    const src: DocumentSource = { kind: "stored", documentId: "doc-missing" };
    let err: unknown;
    try { await resolveDocumentFile(src); }
    catch (e) { err = e; }
    expect(err).toBeDefined();
    expect((err as { code?: string }).code).toBe("NOT_FOUND");
  });
});

// ── resolveDocumentFile — url source (cross-origin blocked) ──────────────────

describe("resolveDocumentFile — url source", () => {
  it("rejects cross-origin URLs", async () => {
    const src: DocumentSource = {
      kind:     "url",
      url:      "https://evil.example.com/file.pdf",
      fileName: "file.pdf",
      mimeType: "application/pdf",
    };
    await expect(resolveDocumentFile(src)).rejects.toThrow(/cross-origin/i);
  });

  it("rejects invalid URLs", async () => {
    const src: DocumentSource = {
      kind:     "url",
      url:      "not-a-url-at-all:::###",
      fileName: "file.pdf",
      mimeType: "application/pdf",
    };
    await expect(resolveDocumentFile(src)).rejects.toThrow();
  });
});
