/**
 * Document format detection utilities.
 *
 * Single source of truth for mapping a document record to a workspace type.
 * Uses both MIME type and file extension — never relies on name alone.
 */
import type { BoardDocument } from "../data/boardMeetingData";

// ── Workspace type ─────────────────────────────────────────────────────────────

export type DocumentWorkspaceType =
  | "rich-text"     // Tiptap local editor (DOCX, ODT, RTF, plain editor)
  | "pdf"           // PDF viewer with annotation support
  | "spreadsheet"   // Spreadsheet editor (XLSX, XLS, CSV, TSV, ODS, XLSM)
  | "presentation"  // Presentation viewer (PPTX, PPT, ODP)
  | "image"         // Inline image viewer
  | "unsupported";  // Download-only fallback

// ── ONLYOFFICE document type (passed to the backend config request) ─────────────

export type OnlyOfficeDocumentType = "word" | "cell" | "slide" | "pdf";

// ── Extension → workspace type map ────────────────────────────────────────────

const EXT_MAP: Record<string, DocumentWorkspaceType> = {
  // Rich text
  docx: "rich-text", doc: "rich-text", odt: "rich-text",
  rtf:  "rich-text", txt: "rich-text", md:  "rich-text",
  // PDF
  pdf: "pdf",
  // Spreadsheet
  xlsx: "spreadsheet", xls:  "spreadsheet", xlsm: "spreadsheet", xlsb: "spreadsheet",
  csv:  "spreadsheet", tsv:  "spreadsheet", ods:  "spreadsheet",
  // Presentation
  pptx: "presentation", ppt: "presentation", odp: "presentation",
  // Image
  png: "image", jpg: "image", jpeg: "image",
  gif: "image", webp: "image", svg: "image", bmp: "image",
};

// MIME → workspace type (authoritative when present)
const MIME_MAP: Record<string, DocumentWorkspaceType> = {
  "application/pdf":                          "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":     "rich-text",
  "application/msword":                       "rich-text",
  "application/vnd.oasis.opendocument.text":  "rich-text",
  "application/rtf":                          "rich-text",
  "text/rtf":                                 "rich-text",
  "text/plain":                               "rich-text",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":           "spreadsheet",
  "application/vnd.ms-excel":                 "spreadsheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12": "spreadsheet",
  "application/vnd.oasis.opendocument.spreadsheet": "spreadsheet",
  "text/csv":                                 "spreadsheet",
  "application/csv":                          "spreadsheet",
  "text/tab-separated-values":                "spreadsheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":   "presentation",
  "application/vnd.ms-powerpoint":            "presentation",
  "application/vnd.oasis.opendocument.presentation": "presentation",
  // Images
  "image/jpeg":  "image",
  "image/jpg":   "image",
  "image/png":   "image",
  "image/gif":   "image",
  "image/webp":  "image",
  "image/svg+xml": "image",
  "image/bmp":   "image",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getFileExtension(doc: BoardDocument): string {
  return (doc.file_format ?? doc.file_name?.split(".").pop() ?? "")
    .toLowerCase()
    .replace(/^\./, "");
}

export function getDocumentWorkspaceType(doc: BoardDocument): DocumentWorkspaceType {
  if (doc.content_type === "editor") return "rich-text";

  // Honour explicit workspace_type field if already set
  const explicit = (doc as { workspace_type?: string }).workspace_type as DocumentWorkspaceType | undefined;
  if (explicit && explicit !== "unsupported") return explicit;

  // MIME type takes priority — canonical field is mime_type; file_mime is legacy alias
  const docAny = doc as { mime_type?: string; file_mime?: string };
  const mime = docAny.mime_type ?? docAny.file_mime;
  if (mime && MIME_MAP[mime]) return MIME_MAP[mime];

  const ext = getFileExtension(doc);
  if (!ext || ext === "editor") return "rich-text";

  return EXT_MAP[ext] ?? "unsupported";
}

/** Maps workspace type to the ONLYOFFICE document type string. */
export function getOnlyOfficeDocumentType(wsType: DocumentWorkspaceType): OnlyOfficeDocumentType {
  switch (wsType) {
    case "spreadsheet":  return "cell";
    case "presentation": return "slide";
    case "pdf":          return "pdf";
    default:             return "word";
  }
}

/** True if the file is macro-enabled and must never execute in the browser. */
export function isMacroEnabledWorkbook(doc: BoardDocument): boolean {
  const ext = getFileExtension(doc);
  const docAny = doc as { mime_type?: string; file_mime?: string };
  const mime = docAny.mime_type ?? docAny.file_mime;
  return ext === "xlsm" || ext === "xlsb" ||
    mime === "application/vnd.ms-excel.sheet.macroEnabled.12";
}

/** Human-readable workspace type label. */
export function workspaceTypeLabel(type: DocumentWorkspaceType): string {
  const labels: Record<DocumentWorkspaceType, string> = {
    "rich-text":    "Document Editor",
    "pdf":          "PDF Viewer",
    "spreadsheet":  "Spreadsheet",
    "presentation": "Presentation",
    "image":        "Image Viewer",
    "unsupported":  "File Download",
  };
  return labels[type];
}

/** Returns a MIME type for a file extension, used when building download links. */
export function mimeForExtension(ext: string): string {
  const map: Record<string, string> = {
    pdf:  "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc:  "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls:  "application/vnd.ms-excel",
    xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
    csv:  "text/csv",
    tsv:  "text/tab-separated-values",
    ods:  "application/vnd.oasis.opendocument.spreadsheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt:  "application/vnd.ms-powerpoint",
    txt:  "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}
