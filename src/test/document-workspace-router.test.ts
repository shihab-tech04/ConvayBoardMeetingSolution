/**
 * Phase 8: DocumentWorkspaceRouter — format routing logic tests.
 * Tests the workspace type detection that determines which workspace renders.
 */
import { describe, it, expect } from "vitest";
import { getDocumentWorkspaceType } from "../app/utils/documentFormat";
import type { BoardDocument } from "../app/data/boardMeetingData";

function doc(overrides: Partial<BoardDocument> = {}): BoardDocument {
  return {
    id: "doc-001",
    doc_id: "doc-001",
    doc_name: "Test",
    title: "Test",
    approval_status: "Draft",
    version: "1.0",
    content_type: "file",
    ...overrides,
  } as BoardDocument;
}

// ── Router decisions ──────────────────────────────────────────────────────────

describe("workspace router — routing decisions", () => {
  it("routes PDF document to pdf workspace", () => {
    const wsType = getDocumentWorkspaceType(doc({ file_name: "agenda.pdf" }));
    expect(wsType).toBe("pdf");
  });

  it("routes XLSX to spreadsheet workspace", () => {
    const wsType = getDocumentWorkspaceType(doc({ file_name: "budget.xlsx" }));
    expect(wsType).toBe("spreadsheet");
  });

  it("routes DOCX to rich-text workspace", () => {
    const wsType = getDocumentWorkspaceType(doc({ file_name: "report.docx" }));
    expect(wsType).toBe("rich-text");
  });

  it("routes PPTX to presentation workspace", () => {
    const wsType = getDocumentWorkspaceType(doc({ file_name: "slides.pptx" }));
    expect(wsType).toBe("presentation");
  });

  it("routes PNG to image workspace", () => {
    const wsType = getDocumentWorkspaceType(doc({ file_name: "logo.png" }));
    expect(wsType).toBe("image");
  });

  it("routes unknown extension to unsupported", () => {
    const wsType = getDocumentWorkspaceType(doc({ file_name: "archive.tar.gz" }));
    expect(wsType).toBe("unsupported");
  });

  it("routes editor content-type to rich-text even without file_name", () => {
    // A document created natively in the editor has no file extension
    const wsType = getDocumentWorkspaceType(doc({ content_type: "editor" }));
    expect(wsType).toBe("rich-text");
  });
});

// ── MIME override ──────────────────────────────────────────────────────────────

describe("workspace router — MIME type priority over extension", () => {
  it("PDF mime_type overrides non-PDF extension", () => {
    expect(getDocumentWorkspaceType(
      doc({ mime_type: "application/pdf", file_name: "document.docx" })
    )).toBe("pdf");
  });

  it("PDF file_mime (legacy) overrides non-PDF extension", () => {
    expect(getDocumentWorkspaceType(
      doc({ file_mime: "application/pdf", file_name: "document.docx" })
    )).toBe("pdf");
  });

  it("spreadsheet mime_type overrides PDF extension", () => {
    expect(getDocumentWorkspaceType(
      doc({
        mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        file_name: "not-a-pdf.pdf",
      })
    )).toBe("spreadsheet");
  });

  it("image mime_type routes to image workspace", () => {
    expect(getDocumentWorkspaceType(doc({ mime_type: "image/jpeg" }))).toBe("image");
  });

  it("image file_mime (legacy) routes to image workspace", () => {
    expect(getDocumentWorkspaceType(doc({ file_mime: "image/jpeg" }))).toBe("image");
  });

  it("canonical mime_type takes priority over legacy file_mime", () => {
    expect(getDocumentWorkspaceType(doc({
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      file_mime: "application/pdf",
    }))).toBe("spreadsheet");
  });
});

// ── Spreadsheet sub-type coverage ──────────────────────────────────────────────

describe("spreadsheet format detection — all expected extensions", () => {
  const SPREADSHEET_EXTS = ["xlsx", "xls", "xlsm", "xlsb", "csv", "tsv", "ods"] as const;

  for (const ext of SPREADSHEET_EXTS) {
    it(`routes .${ext} to spreadsheet`, () => {
      expect(getDocumentWorkspaceType(doc({ file_name: `file.${ext}` }))).toBe("spreadsheet");
    });
  }
});

// ── Rich-text sub-type coverage ────────────────────────────────────────────────

describe("rich-text format detection — all expected extensions", () => {
  const RICH_TEXT_EXTS = ["docx", "doc", "odt", "rtf", "txt", "md"];

  for (const ext of RICH_TEXT_EXTS) {
    it(`routes .${ext} to rich-text`, () => {
      expect(getDocumentWorkspaceType(doc({ file_name: `file.${ext}` }))).toBe("rich-text");
    });
  }
});

// ── Content type override for native editor documents ─────────────────────────

describe("content_type=editor routing", () => {
  it("content_type editor always routes to rich-text", () => {
    // Even if file_mime is unknown, editor documents should be rich-text
    const wsType = getDocumentWorkspaceType(doc({ content_type: "editor" }));
    expect(wsType).toBe("rich-text");
  });
});
