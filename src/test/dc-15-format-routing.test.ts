import { describe, expect, it } from "vitest";
import { getDocumentWorkspaceType, isMacroEnabledWorkbook, normalizeDocumentMime } from "../app/utils/documentFormat";
import type { BoardDocument } from "../app/data/boardMeetingData";
const file = (overrides: Partial<BoardDocument> = {}): BoardDocument => ({
  id: "d1",
  doc_id: "d1",
  doc_name: "Test document",
  doc_number: "DOC-15-001",
  doc_type: "Board paper",
  related_meeting: "",
  related_agenda: "",
  owner: "Test user",
  version: "1.0",
  confidentiality: "Internal",
  effective_date: "",
  expiry_date: "",
  acknowledgement_required: "No",
  approval_status: "Draft",
  created_at: "2026-11-18T00:00:00.000Z",
  content_type: "uploaded",
  ...overrides,
});

describe("DC-15 unified file-format routing", () => {
  it("routes PDF MIME with upper casing and charset", () => expect(getDocumentWorkspaceType(file({ mime_type: " Application/PDF; charset=binary " }))).toBe("pdf"));
  it("routes XLSX MIME with parameters", () => expect(getDocumentWorkspaceType(file({ mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8" }))).toBe("spreadsheet"));
  it("routes macro spreadsheet regardless of MIME key casing", () => {
    const d = file({ mime_type: "Application/VND.MS-EXCEL.SHEET.MACROENABLED.12; charset=binary" });
    expect(getDocumentWorkspaceType(d)).toBe("spreadsheet");
    expect(isMacroEnabledWorkbook(d)).toBe(true);
  });
  it("valid explicit workspace stays authoritative", () => expect(getDocumentWorkspaceType(file({ workspace_type: "pdf", file_name: "sheet.xlsx" }))).toBe("pdf"));
  it("ignores malformed explicit workspace and routes known MIME", () => expect(getDocumentWorkspaceType(file({ workspace_type: "not-a-workspace", mime_type: "application/pdf" }))).toBe("pdf"));
  it("invalid explicit workspace falls back to filename type", () => expect(getDocumentWorkspaceType(file({ workspace_type: "unexpected", file_name: "report.csv" }))).toBe("spreadsheet"));
  it("preserves existing native editor precedence", () => expect(getDocumentWorkspaceType(file({ content_type: "editor", mime_type: "application/pdf" }))).toBe("rich-text"));
  it("preserves old unnamed legacy editor fallback", () => expect(getDocumentWorkspaceType(file())).toBe("rich-text"));
  it("unknown file extension remains unsupported", () => expect(getDocumentWorkspaceType(file({ file_name: "archive.zip" }))).toBe("unsupported"));
  it("normalizes blank/parameterized MIME", () => {
    expect(normalizeDocumentMime(null)).toBe("");
    expect(normalizeDocumentMime(" TEXT/CSV ; charset=utf-8 ")).toBe("text/csv");
  });
});
