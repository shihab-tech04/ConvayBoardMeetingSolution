import Dexie, { type Table } from "dexie";
import type { StoredContent } from "../types/documents";

class DocumentContentDatabase extends Dexie {
  contents!: Table<StoredContent, string>;

  constructor() {
    super("bms.documentContent");
    this.version(1).stores({
      // id is the primary key; indices for document_id and version_id lookups
      contents: "id, document_id, version_id, content_type",
    });
  }
}

const db = new DocumentContentDatabase();

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const documentContentStore = {
  /** Store editor JSON content for a document/version. */
  async putEditorContent(
    documentId: string,
    content: string,
    versionId?: string,
  ): Promise<string> {
    const id = versionId ? `editor:${documentId}:${versionId}` : `editor:${documentId}:live`;
    const entry: StoredContent = {
      id,
      document_id: documentId,
      version_id: versionId,
      content_type: "editor_json",
      content,
      stored_at: new Date().toISOString(),
      size: new Blob([content]).size,
    };
    await db.contents.put(entry);
    return id;
  },

  /** Retrieve editor JSON content for a document/version. */
  async getEditorContent(documentId: string, versionId?: string): Promise<string | null> {
    const id = versionId ? `editor:${documentId}:${versionId}` : `editor:${documentId}:live`;
    const entry = await db.contents.get(id);
    return entry ? (entry.content as string) : null;
  },

  /** Store an original uploaded file as an ArrayBuffer. */
  async putOriginalFile(
    documentId: string,
    file: File,
    versionId?: string,
  ): Promise<string> {
    const buffer = await file.arrayBuffer();
    const id = `file:${documentId}:${versionId ?? "latest"}`;
    const entry: StoredContent = {
      id,
      document_id: documentId,
      version_id: versionId,
      content_type: "original_file",
      content: buffer,
      mime_type: file.type,
      file_name: file.name,
      stored_at: new Date().toISOString(),
      size: buffer.byteLength,
    };
    await db.contents.put(entry);
    return id;
  },

  /** Retrieve an original file as a File object. */
  async getOriginalFile(documentId: string, versionId?: string): Promise<File | null> {
    const id = `file:${documentId}:${versionId ?? "latest"}`;
    const entry = await db.contents.get(id);
    if (!entry || !(entry.content instanceof ArrayBuffer)) return null;
    return new File([entry.content], entry.file_name ?? "document", {
      type: entry.mime_type ?? "application/octet-stream",
    });
  },

  /** Save a version snapshot (converted HTML). */
  async putVersionSnapshot(
    documentId: string,
    versionId: string,
    html: string,
  ): Promise<string> {
    const id = `snap:${documentId}:${versionId}`;
    const entry: StoredContent = {
      id,
      document_id: documentId,
      version_id: versionId,
      content_type: "version_snapshot",
      content: html,
      mime_type: "text/html",
      stored_at: new Date().toISOString(),
      size: new Blob([html]).size,
    };
    await db.contents.put(entry);
    return id;
  },

  /** Store converted HTML content for a document. */
  async putConvertedContent(
    documentId: string,
    html: string,
    versionId?: string,
  ): Promise<string> {
    const id = `converted:${documentId}:${versionId ?? "latest"}`;
    const entry: StoredContent = {
      id,
      document_id: documentId,
      version_id: versionId,
      content_type: "converted_html",
      content: html,
      mime_type: "text/html",
      stored_at: new Date().toISOString(),
      size: new Blob([html]).size,
    };
    await db.contents.put(entry);
    return id;
  },

  /** List all stored content entries for a document. */
  async listByDocument(documentId: string): Promise<StoredContent[]> {
    return db.contents.where("document_id").equals(documentId).toArray();
  },

  /** Delete all content for a document. */
  async deleteByDocument(documentId: string): Promise<void> {
    await db.contents.where("document_id").equals(documentId).delete();
  },

  /** Delete a specific content entry. */
  async delete(id: string): Promise<void> {
    await db.contents.delete(id);
  },

  /** Retrieve a version snapshot HTML by version ID. */
  async getVersionSnapshot(documentId: string, versionId: string): Promise<string | null> {
    const id = `snap:${documentId}:${versionId}`;
    const entry = await db.contents.get(id);
    return entry ? (entry.content as string) : null;
  },

  /** Estimate total storage used by all document content (in bytes). */
  async estimateStorageBytes(): Promise<number> {
    const all = await db.contents.toArray();
    return all.reduce((sum, e) => {
      if (typeof e.content === "string") return sum + new Blob([e.content]).size;
      if (e.content instanceof ArrayBuffer) return sum + e.content.byteLength;
      return sum;
    }, 0);
  },

  // ── Spreadsheet workbook ─────────────────────────────────────────────────────

  /** Store the live spreadsheet workbook state (JSON-serialised). */
  async putSpreadsheetWorkbook(documentId: string, json: string, versionId?: string): Promise<string> {
    const id = versionId ? `sheet:${documentId}:${versionId}` : `sheet:${documentId}:live`;
    await db.contents.put({
      id, document_id: documentId, version_id: versionId,
      content_type: "spreadsheet_workbook", content: json,
      stored_at: new Date().toISOString(), size: new Blob([json]).size,
    });
    return id;
  },

  async getSpreadsheetWorkbook(documentId: string, versionId?: string): Promise<string | null> {
    const id = versionId ? `sheet:${documentId}:${versionId}` : `sheet:${documentId}:live`;
    const entry = await db.contents.get(id);
    return entry ? (entry.content as string) : null;
  },

  /** Store a named spreadsheet version snapshot. */
  async putSpreadsheetSnapshot(documentId: string, versionId: string, json: string): Promise<string> {
    const id = `sheet-snap:${documentId}:${versionId}`;
    await db.contents.put({
      id, document_id: documentId, version_id: versionId,
      content_type: "spreadsheet_snapshot", content: json,
      stored_at: new Date().toISOString(), size: new Blob([json]).size,
    });
    return id;
  },

  async getSpreadsheetSnapshot(documentId: string, versionId: string): Promise<string | null> {
    const id = `sheet-snap:${documentId}:${versionId}`;
    const entry = await db.contents.get(id);
    return entry ? (entry.content as string) : null;
  },

  // ── PDF annotations ──────────────────────────────────────────────────────────

  /** Store live PDF annotation metadata as JSON. */
  async putPdfAnnotations(documentId: string, json: string, versionId?: string): Promise<string> {
    const id = versionId ? `pdfann:${documentId}:${versionId}` : `pdfann:${documentId}:live`;
    await db.contents.put({
      id, document_id: documentId, version_id: versionId,
      content_type: "pdf_annotations", content: json,
      stored_at: new Date().toISOString(), size: new Blob([json]).size,
    });
    return id;
  },

  async getPdfAnnotations(documentId: string, versionId?: string): Promise<string | null> {
    const id = versionId ? `pdfann:${documentId}:${versionId}` : `pdfann:${documentId}:live`;
    const entry = await db.contents.get(id);
    return entry ? (entry.content as string) : null;
  },

  /** Store a named annotation snapshot (for version history). */
  async putPdfAnnotationSnapshot(documentId: string, versionId: string, json: string): Promise<string> {
    const id = `pdfann-snap:${documentId}:${versionId}`;
    await db.contents.put({
      id, document_id: documentId, version_id: versionId,
      content_type: "pdf_annotation_snapshot", content: json,
      stored_at: new Date().toISOString(), size: new Blob([json]).size,
    });
    return id;
  },

  async getPdfAnnotationSnapshot(documentId: string, versionId: string): Promise<string | null> {
    const id = `pdfann-snap:${documentId}:${versionId}`;
    const entry = await db.contents.get(id);
    return entry ? (entry.content as string) : null;
  },
};
