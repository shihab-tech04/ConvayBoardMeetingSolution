/**
 * Shared file validation utilities.
 * Extracted from AppFileUpload.tsx so the same extension, MIME, magic-byte,
 * dangerous-signature, and Office-container checks are reusable across all
 * upload surfaces (Document Library, meeting docs, agenda attachments, forms).
 *
 * Each upload surface keeps its own accepted-extension list, max-size, and
 * error messages — this module validates only the file contents.
 */

// ── Allowed file rules ────────────────────────────────────────────────────────

export const ALLOWED_FILE_RULES: Record<string, { mime: string[]; magic: number[][] }> = {
  ".pdf":  { mime: ["application/pdf"], magic: [[0x25, 0x50, 0x44, 0x46]] },
  ".png":  { mime: ["image/png"],       magic: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]] },
  ".jpg":  { mime: ["image/jpeg"],      magic: [[0xFF, 0xD8, 0xFF]] },
  ".jpeg": { mime: ["image/jpeg"],      magic: [[0xFF, 0xD8, 0xFF]] },
  ".gif":  { mime: ["image/gif"],       magic: [[0x47, 0x49, 0x46, 0x38]] },
  ".webp": { mime: ["image/webp"],      magic: [[0x52, 0x49, 0x46, 0x46]] },
  // Legacy OLE2 compound documents
  ".doc":  { mime: ["application/msword", "application/x-ole-storage"], magic: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]] },
  ".xls":  { mime: ["application/vnd.ms-excel", "application/x-ole-storage"], magic: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]] },
  ".ppt":  { mime: ["application/vnd.ms-powerpoint", "application/x-ole-storage"], magic: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]] },
  // OOXML / ZIP-based Office formats
  ".docx": { mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"], magic: [[0x50, 0x4B, 0x03, 0x04]] },
  ".xlsx": { mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       "application/zip", "application/octet-stream"], magic: [[0x50, 0x4B, 0x03, 0x04]] },
  ".pptx": { mime: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip", "application/octet-stream"], magic: [[0x50, 0x4B, 0x03, 0x04]] },
  // ODF formats (ZIP-based)
  ".odt":  { mime: ["application/vnd.oasis.opendocument.text",         "application/zip", "application/octet-stream"], magic: [[0x50, 0x4B, 0x03, 0x04]] },
  ".ods":  { mime: ["application/vnd.oasis.opendocument.spreadsheet",  "application/zip", "application/octet-stream"], magic: [[0x50, 0x4B, 0x03, 0x04]] },
  ".odp":  { mime: ["application/vnd.oasis.opendocument.presentation", "application/zip", "application/octet-stream"], magic: [[0x50, 0x4B, 0x03, 0x04]] },
  // XLSM — macro-enabled workbook (macros are never executed)
  ".xlsm": { mime: ["application/vnd.ms-excel.sheet.macroEnabled.12",  "application/zip", "application/octet-stream"], magic: [[0x50, 0x4B, 0x03, 0x04]] },
  // RTF
  ".rtf":  { mime: ["application/rtf", "text/rtf", "application/octet-stream"], magic: [[0x7B, 0x5C, 0x72, 0x74, 0x66]] },
  // Text-based plain formats — no magic bytes
  ".csv":  { mime: ["text/csv", "application/csv", "text/plain", "application/octet-stream"], magic: [] },
  ".tsv":  { mime: ["text/tab-separated-values", "text/plain", "application/octet-stream"],   magic: [] },
  ".txt":  { mime: ["text/plain", "application/octet-stream"],                                 magic: [] },
  ".md":   { mime: ["text/markdown", "text/plain", "application/octet-stream"],                magic: [] },
};

// ── Low-level byte helpers ─────────────────────────────────────────────────────

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? "." + parts.pop()!.toLowerCase() : "";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileHeader(file: File, bytes = 32): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

function readFileBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function hasBytes(buf: Uint8Array, sig: number[], offset = 0): boolean {
  return sig.every((b, i) => buf[offset + i] === b);
}

function hasAsciiPrefix(buf: Uint8Array, text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (buf[i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

function includesAscii(buffer: ArrayBuffer, text: string): boolean {
  const view   = new Uint8Array(buffer);
  const target = Array.from(text).map(c => c.charCodeAt(0));
  outer: for (let i = 0; i <= view.length - target.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (view[i + j] !== target[j]) continue outer;
    }
    return true;
  }
  return false;
}

// ── Dangerous-signature check ─────────────────────────────────────────────────

export function isDangerousSignature(buf: Uint8Array): boolean {
  if (hasBytes(buf, [0x4D, 0x5A])) return true;                       // Windows PE / MS-DOS
  if (hasBytes(buf, [0x7F, 0x45, 0x4C, 0x46])) return true;           // ELF
  if (hasBytes(buf, [0xFE, 0xED, 0xFA, 0xCE])) return true;           // Mach-O
  if (hasBytes(buf, [0xFE, 0xED, 0xFA, 0xCF])) return true;
  if (hasBytes(buf, [0xCF, 0xFA, 0xED, 0xFE])) return true;
  if (hasBytes(buf, [0xCE, 0xFA, 0xED, 0xFE])) return true;
  if (hasAsciiPrefix(buf, "#!")) return true;                          // Shell script
  const lower = String.fromCharCode(...buf.slice(0, 16)).toLowerCase().trimStart();
  if (lower.startsWith("<!doctype") || lower.startsWith("<html")) return true;
  return false;
}

// ── MIME + magic validation ───────────────────────────────────────────────────

export function validateMimeForExtension(file: File, extension: string): boolean {
  if (!file.type) return true;
  const rule = ALLOWED_FILE_RULES[extension];
  if (!rule) return false;
  return rule.mime.includes(file.type) || file.type === "application/octet-stream";
}

export async function validateMagicSignature(file: File, extension: string): Promise<boolean> {
  const rule = ALLOWED_FILE_RULES[extension];
  if (!rule) return false;
  if (rule.magic.length === 0) return true; // text-based; no magic check
  const buf = await readFileHeader(file, 32);
  return rule.magic.some(sig => hasBytes(buf, sig));
}

export async function validateOfficeMarkers(file: File, extension: string): Promise<boolean> {
  const buffer = await readFileBuffer(file);
  if (extension === ".docx") return includesAscii(buffer, "[Content_Types].xml") && includesAscii(buffer, "word/");
  if (extension === ".xlsx") return includesAscii(buffer, "[Content_Types].xml") && includesAscii(buffer, "xl/");
  if (extension === ".pptx") return includesAscii(buffer, "[Content_Types].xml") && includesAscii(buffer, "ppt/");
  if ([".odt", ".ods", ".odp"].includes(extension)) return includesAscii(buffer, "mimetype") && includesAscii(buffer, "content.xml");
  if (extension === ".xlsm") return includesAscii(buffer, "[Content_Types].xml") && includesAscii(buffer, "xl/");
  return true;
}

// ── Main per-file validator ───────────────────────────────────────────────────

export type FileValidationResult = { ok: true } | { ok: false; error: string };

export async function validateFile(
  file: File,
  accept: string[],
  maxSizeMB: number,
): Promise<FileValidationResult> {
  const extension = getFileExtension(file.name);

  if (!accept.includes(extension)) {
    return { ok: false, error: `${file.name} has an unsupported file type.` };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { ok: false, error: `${file.name} is larger than ${maxSizeMB}MB.` };
  }
  if (!validateMimeForExtension(file, extension)) {
    return { ok: false, error: `${file.name} has a mismatched file type.` };
  }

  let header: Uint8Array;
  try {
    header = await readFileHeader(file, 32);
  } catch {
    return { ok: false, error: `Could not read ${file.name}. Please try another file.` };
  }

  if (isDangerousSignature(header)) {
    return { ok: false, error: `${file.name} appears to be an unsafe executable or script file.` };
  }

  let magicOk: boolean;
  try {
    magicOk = await validateMagicSignature(file, extension);
  } catch {
    return { ok: false, error: `Could not read ${file.name}. Please try another file.` };
  }
  if (!magicOk) {
    return {
      ok: false,
      error: `${file.name} does not match its file type. Please upload a valid ${extension.replace(".", "").toUpperCase()} file.`,
    };
  }

  const officeExts = [".docx", ".xlsx", ".pptx", ".xlsm", ".odt", ".ods", ".odp"];
  if (officeExts.includes(extension)) {
    let markersOk: boolean;
    try {
      markersOk = await validateOfficeMarkers(file, extension);
    } catch {
      return { ok: false, error: `Could not read ${file.name}. Please try another file.` };
    }
    if (!markersOk) {
      return { ok: false, error: `${file.name} is not a valid Office document.` };
    }
  }

  return { ok: true };
}
