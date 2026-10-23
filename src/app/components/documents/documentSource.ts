/**
 * Discriminated union for document file sources.
 * Both the Document Library and attachment flows use this as their common
 * file reference — no temporary object URLs stored as permanent references.
 */

import { documentContentStore } from "../../services/repositories/documentContentStore";

export type DocumentSource =
  | { kind: "stored"; documentId: string; versionId?: string }
  | { kind: "file"; file: File }
  | { kind: "blob"; blob: Blob; fileName: string; mimeType: string }
  | { kind: "url"; url: string; fileName: string; mimeType: string };

export function getSourceFileName(source: DocumentSource): string {
  switch (source.kind) {
    case "stored": return "";
    case "file":   return source.file.name;
    case "blob":   return source.fileName;
    case "url":    return source.fileName;
  }
}

export function getSourceMimeType(source: DocumentSource): string {
  switch (source.kind) {
    case "stored": return "";
    case "file":   return source.file.type;
    case "blob":   return source.mimeType;
    case "url":    return source.mimeType;
  }
}

export async function resolveDocumentFile(source: DocumentSource): Promise<File> {
  switch (source.kind) {
    case "stored": {
      const file = await documentContentStore.getOriginalFile(source.documentId);
      if (!file) {
        throw Object.assign(new Error("File not found"), { code: "NOT_FOUND" });
      }
      return file;
    }

    case "file":
      return source.file;

    case "blob":
      return new File([source.blob], source.fileName, { type: source.mimeType });

    case "url": {
      let parsed: URL;
      try { parsed = new URL(source.url, window.location.href); }
      catch { throw new Error("Invalid file URL"); }

      const isBlobUrl    = parsed.protocol === "blob:";
      const isSameOrigin = parsed.origin === window.location.origin;
      if (!isBlobUrl && !isSameOrigin) {
        throw new Error("Cross-origin file loading is not permitted");
      }

      const resp = await fetch(source.url);
      if (!resp.ok) throw new Error(`Failed to load file: HTTP ${resp.status}`);
      const blob = await resp.blob();
      return new File([blob], source.fileName, { type: source.mimeType || blob.type });
    }
  }
}
