import type { BoardDocument, DocumentVersion } from "../../data/boardMeetingData";
import type {
  DocumentRepository, DocumentListOptions, Page,
  DocumentComment, DocumentAccessEntry, DocumentApprovalStep,
} from "../types/documents";
import { convayAuth } from "../supabase/convayAuth";
import { normalizeBoardDocument } from "../../utils/normalizeBoardDocument";
import { documentContentStore } from "./documentContentStore";

function matches(doc: BoardDocument, opts: DocumentListOptions): boolean {
  if (opts.search) {
    const term = opts.search.toLowerCase();
    if (![doc.doc_name, doc.doc_type, doc.owner, doc.doc_id].join(" ").toLowerCase().includes(term))
      return false;
  }
  if (opts.doc_type && opts.doc_type !== "All Types" && doc.doc_type !== opts.doc_type) return false;
  if (opts.approval_status && opts.approval_status !== "All Status" && doc.approval_status !== opts.approval_status) return false;
  if (opts.related_meeting && doc.related_meeting !== opts.related_meeting) return false;
  if (opts.folder_id && doc.folder_id !== opts.folder_id) return false;
  if (opts.is_template !== undefined && !!doc.is_template !== opts.is_template) return false;
  if (opts.tags?.length) {
    const tags = (doc.tags ?? "").split(",").map(t => t.trim().toLowerCase());
    if (!opts.tags.some(t => tags.includes(t.toLowerCase()))) return false;
  }
  return true;
}
type RecordWithId = { id: string };
async function listRecords<T extends RecordWithId>(key: string) {
  return (await convayAuth.registry<T>(key, "list")).records;
}
async function createRecord<T extends RecordWithId>(key: string, value: T): Promise<T> {
  await convayAuth.registry(key, "create", value);
  return value;
}
async function editRecord<T extends RecordWithId>(
  key: string, id: string, patch: Partial<T>,
): Promise<T> {
  const records = await listRecords<T>(key);
  const entry = records.find(r => r.payload.id === id);
  if (!entry) throw new Error("Record not found");
  const next: T = { ...entry.payload, ...patch, id };
  await convayAuth.registry(key, "update", next, entry.revision);
  return next;
}
async function removeRecord<T extends RecordWithId>(key: string, id: string): Promise<void> {
  const records = await listRecords<T>(key);
  const entry = records.find(r => r.payload.id === id);
  if (!entry) return;
  await convayAuth.registry(key, "delete", entry.payload, entry.revision);
}
const uniqueId = () => crypto.randomUUID();

export class SupabaseDocumentRepository implements DocumentRepository {
  async list(opts: DocumentListOptions = {}): Promise<Page<BoardDocument>> {
    const records = await listRecords<BoardDocument>("bms.documents");
    let docs = records.map(row => normalizeBoardDocument(row.payload as unknown as Record<string, unknown>))
      .filter(doc => matches(doc, opts));
    if (opts.sortBy) {
      const key = String(opts.sortBy);
      const direction = opts.sortDir === "desc" ? -1 : 1;
      docs = [...docs].sort((a,b) =>
        String((a as unknown as Record<string, unknown>)[key] ?? "").localeCompare(
          String((b as unknown as Record<string, unknown>)[key] ?? "")) * direction);
    }
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.max(1, opts.pageSize ?? 20);
    return {
      items: docs.slice((page - 1) * pageSize, page * pageSize),
      total: docs.length, page, pageSize,
    };
  }
  async getById(id: string): Promise<BoardDocument | undefined> {
    return (await listRecords<BoardDocument>("bms.documents")).find(x => x.payload.id === id)?.payload;
  }
  async create(doc: Omit<BoardDocument, "id" | "doc_id" | "created_at">): Promise<BoardDocument> {
    const id = "DOC-" + new Date().getFullYear() + "-" + uniqueId().slice(0,8).toUpperCase();
    return createRecord("bms.documents", { ...doc, id, doc_id: id, created_at: new Date().toISOString() });
  }
  async update(id: string, patch: Partial<BoardDocument>): Promise<BoardDocument> {
    return editRecord("bms.documents", id, patch);
  }
  async remove(id: string): Promise<void> {
    // The SQL transaction deletes the parent and all dependent content together.
    // A private queue records any Storage files that still require deletion.
    const response = await convayAuth.authenticatedRequest(
      "/rest/v1/rpc/convay_remove_document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_document_id: id }),
      },
    );
    const paths = await response.json() as string[];
    const removed: string[] = [];
    const failures: string[] = [];
    for (const path of paths) {
      try {
        await convayAuth.authenticatedRequest(
          "/storage/v1/object/convay-documents/" + path, { method: "DELETE" },
        );
        removed.push(path);
      } catch {
        failures.push(path);
      }
    }
    if (removed.length > 0) {
      await convayAuth.authenticatedRequest("/rest/v1/rpc/convay_confirm_storage_cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_storage_paths: removed }),
      });
    }
    if (failures.length > 0) {
      throw new Error(
        "Document was deleted, but some files could not be removed. " +
        "Their cleanup has been recorded for administrator recovery.",
      );
    }
  }
  async listVersions(documentId: string): Promise<DocumentVersion[]> {
    return (await listRecords<DocumentVersion>("bms.docversions")).map(x => x.payload)
      .filter(x => x.document_id === documentId);
  }
  async getVersion(id: string): Promise<DocumentVersion | undefined> {
    return (await listRecords<DocumentVersion>("bms.docversions")).map(x => x.payload)
      .find(x => x.version_id === id);
  }
  async createVersion(ver: Omit<DocumentVersion, "id" | "version_id" | "created_at">): Promise<DocumentVersion> {
    const id = uniqueId();
    return createRecord("bms.docversions", {
      ...ver, id, version_id: id, created_at: new Date().toISOString(),
    } as DocumentVersion);
  }
  async updateVersion(versionId: string, patch: Partial<DocumentVersion>): Promise<DocumentVersion> {
    const version = await this.getVersion(versionId);
    if (!version) throw new Error("Document version not found");
    return editRecord("bms.docversions", version.id, patch);
  }
  async listComments(documentId: string, versionId?: string): Promise<DocumentComment[]> {
    return (await listRecords<DocumentComment>("bms.doc.comments")).map(x => x.payload)
      .filter(x => x.document_id === documentId && (!versionId || x.version_id === versionId));
  }
  async addComment(comment: Omit<DocumentComment, "id" | "created_at">): Promise<DocumentComment> {
    return createRecord("bms.doc.comments", {
      ...comment, id: uniqueId(), created_at: new Date().toISOString(),
    } as DocumentComment);
  }
  async resolveComment(commentId: string): Promise<void> {
    await editRecord<DocumentComment>("bms.doc.comments", commentId, { resolved: true });
  }
  async deleteComment(commentId: string): Promise<void> {
    await removeRecord<DocumentComment>("bms.doc.comments", commentId);
  }
  async listAccess(documentId: string): Promise<DocumentAccessEntry[]> {
    return (await listRecords<DocumentAccessEntry>("bms.doc.access")).map(x => x.payload)
      .filter(x => x.document_id === documentId);
  }
  async grantAccess(entry: Omit<DocumentAccessEntry, "id" | "granted_at">): Promise<DocumentAccessEntry> {
    return createRecord("bms.doc.access", {
      ...entry, id: uniqueId(), granted_at: new Date().toISOString(),
    } as DocumentAccessEntry);
  }
  async revokeAccess(entryId: string): Promise<void> {
    await removeRecord<DocumentAccessEntry>("bms.doc.access", entryId);
  }
  async listApprovals(documentId: string, versionId: string): Promise<DocumentApprovalStep[]> {
    return (await listRecords<DocumentApprovalStep>("bms.doc.approvals")).map(x => x.payload)
      .filter(x => x.document_id === documentId && x.version_id === versionId);
  }
  async submitApproval(step: Omit<DocumentApprovalStep, "id">): Promise<DocumentApprovalStep> {
    return createRecord("bms.doc.approvals", { ...step, id: uniqueId() } as DocumentApprovalStep);
  }
}