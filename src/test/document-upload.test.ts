/**
 * Upload security validation tests.
 *
 * These test the MIME/extension validation logic in isolation.
 * The full AppFileUpload component integration is covered in AppFileUpload.test.tsx.
 */
import { describe, it, expect } from "vitest";

// ── Validation helpers (extracted logic, matches DocumentLibraryPage upload guard) ──

const ALLOWED_EXTENSIONS = new Set([
  "docx", "doc", "odt", "rtf", "pdf",
  "xlsx", "xls", "xlsm", "pptx", "ppt",
  "ods", "odp", "txt", "csv", "tsv",
]);

const EXTENSION_MIME_MAP: Record<string, string[]> = {
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  doc:  ["application/msword"],
  odt:  ["application/vnd.oasis.opendocument.text"],
  ods:  ["application/vnd.oasis.opendocument.spreadsheet"],
  odp:  ["application/vnd.oasis.opendocument.presentation"],
  rtf:  ["application/rtf", "text/rtf"],
  pdf:  ["application/pdf"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls:  ["application/vnd.ms-excel"],
  xlsm: ["application/vnd.ms-excel.sheet.macroEnabled.12"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ppt:  ["application/vnd.ms-powerpoint"],
  // Text-based: multiple accepted MIMEs; empty-string MIME is also permitted
  txt:  ["text/plain"],
  csv:  ["text/csv", "application/csv", "text/plain"],
  tsv:  ["text/tab-separated-values", "text/plain"],
};

function validateUploadFile(file: { name: string; type: string; size: number }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `Unsupported format: .${ext || "unknown"}. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`;
  }
  const allowedMimes = EXTENSION_MIME_MAP[ext] ?? [];
  if (allowedMimes.length > 0 && file.type && !allowedMimes.includes(file.type)) {
    return `MIME type mismatch: the file claims to be "${file.type}" but has extension .${ext}. The file may be disguised.`;
  }
  if (file.size === 0) {
    return "The file is empty.";
  }
  return null;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Upload validation — valid files", () => {
  it("accepts a valid DOCX", () => {
    const err = validateUploadFile({
      name: "board-paper.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 102400,
    });
    expect(err).toBeNull();
  });

  it("accepts a valid PDF", () => {
    const err = validateUploadFile({ name: "agenda.pdf", type: "application/pdf", size: 204800 });
    expect(err).toBeNull();
  });

  it("accepts a valid XLSX", () => {
    const err = validateUploadFile({
      name: "report.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 51200,
    });
    expect(err).toBeNull();
  });
});

describe("Upload validation — disguised executables", () => {
  it("rejects an EXE disguised as DOCX (wrong MIME)", () => {
    const err = validateUploadFile({
      name: "malware.docx",
      type: "application/x-msdownload",
      size: 20480,
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/MIME type mismatch/i);
  });

  it("rejects a JS file disguised as PDF (wrong MIME)", () => {
    const err = validateUploadFile({
      name: "script.pdf",
      type: "application/javascript",
      size: 1024,
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/MIME type mismatch/i);
  });

  it("rejects an EXE by extension", () => {
    const err = validateUploadFile({
      name: "setup.exe",
      type: "application/x-msdownload",
      size: 1048576,
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/unsupported format/i);
  });

  it("rejects a script file by extension", () => {
    const err = validateUploadFile({ name: "run.sh", type: "text/x-shellscript", size: 256 });
    expect(err).not.toBeNull();
    expect(err).toMatch(/unsupported format/i);
  });
});

describe("Upload validation — invalid Office container", () => {
  it("rejects an empty file", () => {
    const err = validateUploadFile({
      name: "empty.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 0,
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/empty/i);
  });
});

describe("Upload validation — unsupported formats", () => {
  it("rejects .zip", () => {
    const err = validateUploadFile({ name: "archive.zip", type: "application/zip", size: 10000 });
    expect(err).not.toBeNull();
  });

  it("rejects .mp4", () => {
    const err = validateUploadFile({ name: "video.mp4", type: "video/mp4", size: 500000 });
    expect(err).not.toBeNull();
  });

  it("rejects no extension", () => {
    const err = validateUploadFile({ name: "Makefile", type: "text/plain", size: 512 });
    expect(err).not.toBeNull();
  });
});

describe("Upload validation — MIME mismatch detection", () => {
  it("rejects DOC file with DOCX MIME", () => {
    const err = validateUploadFile({
      name: "report.doc",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 30000,
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/MIME type mismatch/i);
  });

  it("accepts empty MIME (browser may omit it for obscure types)", () => {
    // When browser reports no MIME, skip mismatch check — file-extension check still applies
    const err = validateUploadFile({ name: "report.rtf", type: "", size: 8192 });
    expect(err).toBeNull();
  });
});

describe("Upload validation — expanded format support", () => {
  it("accepts XLSM (macro-enabled workbook, macros never executed)", () => {
    const err = validateUploadFile({
      name: "budget-macros.xlsm",
      type: "application/vnd.ms-excel.sheet.macroEnabled.12",
      size: 45000,
    });
    expect(err).toBeNull();
  });

  it("accepts ODS (OpenDocument Spreadsheet)", () => {
    const err = validateUploadFile({
      name: "data.ods",
      type: "application/vnd.oasis.opendocument.spreadsheet",
      size: 32000,
    });
    expect(err).toBeNull();
  });

  it("accepts ODP (OpenDocument Presentation)", () => {
    const err = validateUploadFile({
      name: "slides.odp",
      type: "application/vnd.oasis.opendocument.presentation",
      size: 28000,
    });
    expect(err).toBeNull();
  });

  it("accepts CSV with text/csv MIME", () => {
    const err = validateUploadFile({ name: "export.csv", type: "text/csv", size: 4096 });
    expect(err).toBeNull();
  });

  it("accepts TSV with text/tab-separated-values MIME", () => {
    const err = validateUploadFile({ name: "data.tsv", type: "text/tab-separated-values", size: 2048 });
    expect(err).toBeNull();
  });

  it("accepts TXT with text/plain MIME", () => {
    const err = validateUploadFile({ name: "notes.txt", type: "text/plain", size: 1024 });
    expect(err).toBeNull();
  });

  it("accepts CSV with empty MIME (text browsers may omit)", () => {
    const err = validateUploadFile({ name: "report.csv", type: "", size: 8192 });
    expect(err).toBeNull();
  });

  it("rejects CSV with application/javascript MIME (formula-injection attempt)", () => {
    const err = validateUploadFile({ name: "data.csv", type: "application/javascript", size: 512 });
    expect(err).not.toBeNull();
    expect(err).toMatch(/MIME type mismatch/i);
  });

  it("rejects empty CSV file", () => {
    const err = validateUploadFile({ name: "empty.csv", type: "text/csv", size: 0 });
    expect(err).not.toBeNull();
    expect(err).toMatch(/empty/i);
  });

  it("rejects XLSM with DOCX MIME (disguised file)", () => {
    const err = validateUploadFile({
      name: "malware.xlsm",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 20000,
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/MIME type mismatch/i);
  });
});
