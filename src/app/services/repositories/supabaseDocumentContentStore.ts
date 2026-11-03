import { convayAuth } from "../supabase/convayAuth";
import type { StoredContent } from "../types/documents";

interface DbContent {
  id: string;
  document_id: string;
  version_id: string | null;
  content_type: StoredContent["content_type"];
  content: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_name: string | null;
  stored_at: string;
  size: number;
}
const base = "/rest/v1/convay_document_content";

function filters(values: Record<string, string>) {
  const p = new URLSearchParams();
  p.set("select", "*");
  for (const [key, val] of Object.entries(values)) p.set(key, "eq." + val);
  return "?" + p.toString();
}
async function all(filtersMap: Record<string, string> = {}): Promise<DbContent[]> {
  const rows: DbContent[] = [];
  for (let page = 0; page < 100; page++) {
    const q = new URLSearchParams(filters(filtersMap).slice(1));
    q.set("limit", "1000");
    q.set("offset", String(page * 1000));
    const res = await convayAuth.authenticatedRequest(base + "?" + q.toString());
    const part = await res.json() as DbContent[];
    rows.push(...part);
    if (part.length < 1000) break;
  }
  return rows;
}
async function byId(id: string): Promise<DbContent | null> {
  const rows = await all({ id });
  return rows[0] ?? null;
}
async function save(value: Omit<DbContent, "stored_at"> & { stored_at?: string }) {
  const res = await convayAuth.authenticatedRequest(base + "?on_conflict=id&select=id", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      ...value,
      stored_at: value.stored_at ?? new Date().toISOString(),
    }),
  });
  const stored = await res.json() as Array<{ id: string }>;
  if (!stored.length || stored[0].id !== value.id) {
    throw new Error("Document content was not saved");
  }
}
async function delById(id: string) {
  const res = await convayAuth.authenticatedRequest(base + filters({ id }), {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  const removed = await res.json() as Array<{ id: string }>;
  if (!removed.length) throw new Error("The content was not removed");
}
function toStored(entry: DbContent, content: StoredContent["content"]): StoredContent {
  return {
    id: entry.id, document_id: entry.document_id, version_id: entry.version_id ?? undefined,
    content_type: entry.content_type, content,
    mime_type: entry.mime_type ?? undefined, file_name: entry.file_name ?? undefined,
    stored_at: entry.stored_at, size: entry.size,
  };
}
async function putText(
  id: string, documentId: string, contentType: DbContent["content_type"],
  content: string, versionId?: string, mimeType?: string,
): Promise<string> {
  await save({
    id, document_id: documentId, version_id: versionId ?? null,
    content_type: contentType, content, storage_path: null,
    mime_type: mimeType ?? null, file_name: null,
    size: new Blob([content]).size,
  });
  return id;
}
async function getText(id: string): Promise<string | null> {
  const value = await byId(id);
  return value?.content ?? null;
}
const filePath = (documentId: string, versionId?: string) =>
  encodeURIComponent(documentId) + "/" + encodeURIComponent(versionId ?? "latest") + "/original";
const storage = (path: string) => "/storage/v1/object/" + path;

export const supabaseDocumentContentStore = {
  putEditorContent: (id: string, text: string, version?: string) =>
    putText(version ? "editor:" + id + ":" + version : "editor:" + id + ":live",
      id, "editor_json", text, version),
  getEditorContent: (id: string, version?: string) =>
    getText(version ? "editor:" + id + ":" + version : "editor:" + id + ":live"),
  putConvertedContent: (id: string, html: string, version?: string) =>
    putText("converted:" + id + ":" + (version ?? "latest"), id,
      "converted_html", html, version, "text/html"),
  putVersionSnapshot: (id: string, version: string, html: string) =>
    putText("snap:" + id + ":" + version, id, "version_snapshot", html, version, "text/html"),
  getVersionSnapshot: (id: string, version: string) => getText("snap:" + id + ":" + version),
  putSpreadsheetWorkbook: (id: string, json: string, version?: string) =>
    putText(version ? "sheet:" + id + ":" + version : "sheet:" + id + ":live",
      id, "spreadsheet_workbook", json, version, "application/json"),
  getSpreadsheetWorkbook: (id: string, version?: string) =>
    getText(version ? "sheet:" + id + ":" + version : "sheet:" + id + ":live"),
  putSpreadsheetSnapshot: (id: string, version: string, json: string) =>
    putText("sheet-snap:" + id + ":" + version, id, "spreadsheet_snapshot",
      json, version, "application/json"),
  getSpreadsheetSnapshot: (id: string, version: string) =>
    getText("sheet-snap:" + id + ":" + version),
  putPdfAnnotations: (id: string, json: string, version?: string) =>
    putText(version ? "pdfann:" + id + ":" + version : "pdfann:" + id + ":live",
      id, "pdf_annotations", json, version, "application/json"),
  getPdfAnnotations: (id: string, version?: string) =>
    getText(version ? "pdfann:" + id + ":" + version : "pdfann:" + id + ":live"),
  putPdfAnnotationSnapshot: (id: string, version: string, json: string) =>
    putText("pdfann-snap:" + id + ":" + version, id, "pdf_annotation_snapshot",
      json, version, "application/json"),
  getPdfAnnotationSnapshot: (id: string, version: string) =>
    getText("pdfann-snap:" + id + ":" + version),

  async putOriginalFile(documentId: string, file: File, versionId?: string): Promise<string> {
    const path = filePath(documentId, versionId);
    const id = "file:" + documentId + ":" + (versionId ?? "latest");
    await convayAuth.authenticatedRequest(storage("convay-documents/" + path), {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
      body: file,
    });
    await save({
      id, document_id: documentId, version_id: versionId ?? null,
      content_type: "original_file", content: null, storage_path: path,
      mime_type: file.type || "application/octet-stream", file_name: file.name,
      size: file.size,
    });
    return id;
  },
  async getOriginalFile(documentId: string, versionId?: string): Promise<File | null> {
    const entry = await byId("file:" + documentId + ":" + (versionId ?? "latest"));
    if (!entry || !entry.storage_path) return null;
    const res = await convayAuth.authenticatedRequest(
      storage("authenticated/convay-documents/" + entry.storage_path),
    );
    const blob = await res.blob();
    return new File([blob], entry.file_name ?? "document", {
      type: entry.mime_type ?? "application/octet-stream",
    });
  },
  async listByDocument(documentId: string): Promise<StoredContent[]> {
    const entries = await all({ document_id: documentId });
    return Promise.all(entries.map(async entry => {
      if (entry.content_type === "original_file" && entry.storage_path) {
        const res = await convayAuth.authenticatedRequest(
          storage("authenticated/convay-documents/" + entry.storage_path));
        return toStored(entry, await res.arrayBuffer());
      }
      return toStored(entry, entry.content ?? "");
    }));
  },
  async deleteByDocument(documentId: string): Promise<void> {
    const entries = await all({ document_id: documentId });
    for (const entry of entries) await this.delete(entry.id);
  },
  async delete(id: string): Promise<void> {
    const entry = await byId(id);
    if (!entry) return;
    await delById(id);
    if (entry.storage_path) {
      await convayAuth.authenticatedRequest(
        storage("convay-documents/" + entry.storage_path),
        { method: "DELETE" });
    }
  },
  async estimateStorageBytes(): Promise<number> {
    const entries = await all();
    return entries.reduce((total, entry) => total + entry.size, 0);
  },
};