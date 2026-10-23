/**
 * Phase 8: Document format detection and workspace routing tests.
 */
import { describe, it, expect } from "vitest";
import {
  getDocumentWorkspaceType,
  getOnlyOfficeDocumentType,
  isMacroEnabledWorkbook,
  workspaceTypeLabel,
} from "../app/utils/documentFormat";
import type { BoardDocument } from "../app/data/boardMeetingData";

function doc(overrides: Partial<BoardDocument> = {}): BoardDocument {
  return {
    id: "doc-001",
    doc_id: "doc-001",
    doc_name: "Test Document",
    title: "Test Document",
    approval_status: "Draft",
    version: "1.0",
    content_type: "file",
    ...overrides,
  } as BoardDocument;
}

// ── getDocumentWorkspaceType ─────────────────────────────────────────────────

describe("getDocumentWorkspaceType — canonical mime_type field", () => {
  it("routes PDF mime_type to pdf workspace", () => {
    expect(getDocumentWorkspaceType(doc({ mime_type: "application/pdf" }))).toBe("pdf");
  });

  it("routes XLSX mime_type to spreadsheet workspace", () => {
    expect(getDocumentWorkspaceType(doc({ mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))).toBe("spreadsheet");
  });

  it("routes DOCX mime_type to rich-text workspace", () => {
    expect(getDocumentWorkspaceType(doc({ mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).toBe("rich-text");
  });

  it("routes PPTX mime_type to presentation workspace", () => {
    expect(getDocumentWorkspaceType(doc({ mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }))).toBe("presentation");
  });
});

describe("getDocumentWorkspaceType — legacy file_mime alias still works", () => {
  it("routes PDF file_mime to pdf workspace", () => {
    expect(getDocumentWorkspaceType(doc({ file_mime: "application/pdf" }))).toBe("pdf");
  });

  it("routes XLSX file_mime to spreadsheet workspace", () => {
    expect(getDocumentWorkspaceType(doc({ file_mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))).toBe("spreadsheet");
  });

  it("mime_type takes priority over file_mime when both present", () => {
    expect(getDocumentWorkspaceType(doc({
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      file_mime: "application/pdf",
    }))).toBe("spreadsheet");
  });
});

describe("getDocumentWorkspaceType — extension fallback", () => {
  it("routes .pdf extension to pdf", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "report.pdf" }))).toBe("pdf");
  });

  it("routes .xlsx extension to spreadsheet", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "data.xlsx" }))).toBe("spreadsheet");
  });

  it("routes .xls extension to spreadsheet", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "data.xls" }))).toBe("spreadsheet");
  });

  it("routes .csv extension to spreadsheet", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "export.csv" }))).toBe("spreadsheet");
  });

  it("routes .tsv extension to spreadsheet", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "data.tsv" }))).toBe("spreadsheet");
  });

  it("routes .ods extension to spreadsheet", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "data.ods" }))).toBe("spreadsheet");
  });

  it("routes .xlsm extension to spreadsheet", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "macros.xlsm" }))).toBe("spreadsheet");
  });

  it("routes .docx extension to rich-text", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "report.docx" }))).toBe("rich-text");
  });

  it("routes .txt extension to rich-text", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "notes.txt" }))).toBe("rich-text");
  });

  it("routes .pptx extension to presentation", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "slides.pptx" }))).toBe("presentation");
  });

  it("routes .png extension to image", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "logo.png" }))).toBe("image");
  });

  it("routes .zip extension to unsupported", () => {
    expect(getDocumentWorkspaceType(doc({ file_name: "archive.zip" }))).toBe("unsupported");
  });

  it("routes document with no name or MIME to rich-text (editor fallback)", () => {
    // No file extension → treated as native editor document
    expect(getDocumentWorkspaceType(doc())).toBe("rich-text");
  });

  it("MIME takes priority over extension", () => {
    // file_mime says PDF but extension says docx — MIME wins
    expect(getDocumentWorkspaceType(doc({ file_mime: "application/pdf", file_name: "doc.docx" }))).toBe("pdf");
  });
});

// ── getOnlyOfficeDocumentType ─────────────────────────────────────────────────

describe("getOnlyOfficeDocumentType", () => {
  it("maps rich-text to word", () => {
    expect(getOnlyOfficeDocumentType("rich-text")).toBe("word");
  });

  it("maps spreadsheet to cell", () => {
    expect(getOnlyOfficeDocumentType("spreadsheet")).toBe("cell");
  });

  it("maps presentation to slide", () => {
    expect(getOnlyOfficeDocumentType("presentation")).toBe("slide");
  });

  it("maps pdf to pdf", () => {
    expect(getOnlyOfficeDocumentType("pdf")).toBe("pdf");
  });

  it("maps image to word (default)", () => {
    expect(getOnlyOfficeDocumentType("image")).toBe("word");
  });
});

// ── isMacroEnabledWorkbook ────────────────────────────────────────────────────

describe("isMacroEnabledWorkbook", () => {
  it("returns true for .xlsm extension", () => {
    expect(isMacroEnabledWorkbook(doc({ file_name: "macros.xlsm" }))).toBe(true);
  });

  it("returns true for .xlsb extension", () => {
    expect(isMacroEnabledWorkbook(doc({ file_name: "data.xlsb" }))).toBe(true);
  });

  it("returns false for .xlsx", () => {
    expect(isMacroEnabledWorkbook(doc({ file_name: "data.xlsx" }))).toBe(false);
  });

  it("returns false for .xls", () => {
    expect(isMacroEnabledWorkbook(doc({ file_name: "data.xls" }))).toBe(false);
  });

  it("returns false for a PDF", () => {
    expect(isMacroEnabledWorkbook(doc({ file_name: "report.pdf" }))).toBe(false);
  });
});

// ── workspaceTypeLabel ────────────────────────────────────────────────────────

describe("workspaceTypeLabel", () => {
  it("returns a non-empty string for all workspace types", () => {
    const types = ["rich-text", "pdf", "spreadsheet", "presentation", "image", "unsupported"] as const;
    for (const t of types) {
      expect(workspaceTypeLabel(t).length).toBeGreaterThan(0);
    }
  });
});
