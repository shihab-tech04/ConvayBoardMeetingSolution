import type { BoardDocument, DocumentVersion } from "../../data/boardMeetingData";
import type {
  DocumentRepository,
  DocumentListOptions,
  Page,
  DocumentComment,
  DocumentAccessEntry,
  DocumentApprovalStep,
} from "../types/documents";
import { normalizeBoardDocument } from "../../utils/normalizeBoardDocument";

const STORAGE_KEYS = {
  documents: "bms.documents",
  versions:  "bms.docversions",
  comments:  "bms.doc.comments",
  access:    "bms.doc.access",
  approvals: "bms.doc.approvals",
};

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch { /* quota exceeded — silently ignore */ }
}

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function matches(doc: BoardDocument, opts: DocumentListOptions): boolean {
  if (opts.search) {
    const q = opts.search.toLowerCase();
    const haystack = [doc.doc_name, doc.doc_type, doc.owner, doc.doc_id].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (opts.doc_type && opts.doc_type !== "All Types" && doc.doc_type !== opts.doc_type) return false;
  if (opts.approval_status && opts.approval_status !== "All Status" && doc.approval_status !== opts.approval_status) return false;
  if (opts.related_meeting && doc.related_meeting !== opts.related_meeting) return false;
  if (opts.folder_id && doc.folder_id !== opts.folder_id) return false;
  if (opts.is_template !== undefined && !!doc.is_template !== opts.is_template) return false;
  if (opts.tags?.length) {
    const docTags = (doc.tags ?? "").split(",").map(t => t.trim().toLowerCase());
    if (!opts.tags.some(t => docTags.includes(t.toLowerCase()))) return false;
  }
  return true;
}

export class LocalDocumentRepository implements DocumentRepository {
  // ── Documents ─────────────────────────────────────────────────────────────

  async list(opts: DocumentListOptions = {}): Promise<Page<BoardDocument>> {
    const all = read<Record<string, unknown>>(STORAGE_KEYS.documents)
      .map(normalizeBoardDocument);

    let filtered = all.filter(d => matches(d, opts));

    if (opts.sortBy) {
      const key = opts.sortBy as string;
      const dir = opts.sortDir === "desc" ? -1 : 1;
      filtered = filtered.sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[key] ?? "");
        const bv = String((b as unknown as Record<string, unknown>)[key] ?? "");
        return av.localeCompare(bv) * dir;
      });
    }

    const page     = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const start    = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<BoardDocument | undefined> {
    const all = read<Record<string, unknown>>(STORAGE_KEYS.documents).map(normalizeBoardDocument);
    return all.find(d => d.id === id);
  }

  async create(doc: Omit<BoardDocument, "id" | "doc_id" | "created_at">): Promise<BoardDocument> {
    const existing = read<Record<string, unknown>>(STORAGE_KEYS.documents).map(normalizeBoardDocument);
    const seq = String(existing.length + 1).padStart(4, "0");
    const year = new Date().getFullYear();
    const docId = `DOC-${year}-${seq}`;
    const newDoc: BoardDocument = {
      ...doc,
      id:         docId,
      doc_id:     docId,
      created_at: new Date().toISOString(),
    };
    const raw = read<BoardDocument>(STORAGE_KEYS.documents);
    write(STORAGE_KEYS.documents, [newDoc, ...raw]);
    return newDoc;
  }

  async update(id: string, patch: Partial<BoardDocument>): Promise<BoardDocument> {
    const raw = read<BoardDocument>(STORAGE_KEYS.documents);
    const idx = raw.findIndex(d => d.id === id);
    if (idx < 0) throw new Error(`Document ${id} not found`);
    const updated: BoardDocument = { ...normalizeBoardDocument(raw[idx] as unknown as Record<string, unknown>), ...patch };
    raw[idx] = updated;
    write(STORAGE_KEYS.documents, raw);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const raw = read<BoardDocument>(STORAGE_KEYS.documents);
    write(STORAGE_KEYS.documents, raw.filter(d => d.id !== id));
  }

  // ── Versions ──────────────────────────────────────────────────────────────

  async listVersions(documentId: string): Promise<DocumentVersion[]> {
    return read<DocumentVersion>(STORAGE_KEYS.versions)
      .filter(v => v.document_id === documentId);
  }

  async getVersion(versionId: string): Promise<DocumentVersion | undefined> {
    return read<DocumentVersion>(STORAGE_KEYS.versions)
      .find(v => v.version_id === versionId);
  }

  async createVersion(ver: Omit<DocumentVersion, "id" | "version_id" | "created_at">): Promise<DocumentVersion> {
    const id = uuid();
    const newVer = { ...ver, id, version_id: id, created_at: new Date().toISOString() } as DocumentVersion;
    const raw = read<DocumentVersion>(STORAGE_KEYS.versions);
    write(STORAGE_KEYS.versions, [...raw, newVer]);
    return newVer;
  }

  async updateVersion(versionId: string, patch: Partial<DocumentVersion>): Promise<DocumentVersion> {
    const raw = read<DocumentVersion>(STORAGE_KEYS.versions);
    const idx = raw.findIndex(v => v.version_id === versionId);
    if (idx < 0) throw new Error(`Version ${versionId} not found`);
    const updated: DocumentVersion = { ...raw[idx], ...patch };
    raw[idx] = updated;
    write(STORAGE_KEYS.versions, raw);
    return updated;
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async listComments(documentId: string, versionId?: string): Promise<DocumentComment[]> {
    return read<DocumentComment>(STORAGE_KEYS.comments).filter(c => {
      if (c.document_id !== documentId) return false;
      if (versionId && c.version_id !== versionId) return false;
      return true;
    });
  }

  async addComment(comment: Omit<DocumentComment, "id" | "created_at">): Promise<DocumentComment> {
    const newComment: DocumentComment = { ...comment, id: uuid(), created_at: new Date().toISOString() };
    const raw = read<DocumentComment>(STORAGE_KEYS.comments);
    write(STORAGE_KEYS.comments, [...raw, newComment]);
    return newComment;
  }

  async resolveComment(commentId: string): Promise<void> {
    const raw = read<DocumentComment>(STORAGE_KEYS.comments);
    write(STORAGE_KEYS.comments, raw.map(c => c.id === commentId ? { ...c, resolved: true } : c));
  }

  async deleteComment(commentId: string): Promise<void> {
    const raw = read<DocumentComment>(STORAGE_KEYS.comments);
    write(STORAGE_KEYS.comments, raw.filter(c => c.id !== commentId));
  }

  // ── Access ────────────────────────────────────────────────────────────────

  async listAccess(documentId: string): Promise<DocumentAccessEntry[]> {
    return read<DocumentAccessEntry>(STORAGE_KEYS.access).filter(e => e.document_id === documentId);
  }

  async grantAccess(entry: Omit<DocumentAccessEntry, "id" | "granted_at">): Promise<DocumentAccessEntry> {
    const newEntry: DocumentAccessEntry = { ...entry, id: uuid(), granted_at: new Date().toISOString() };
    const raw = read<DocumentAccessEntry>(STORAGE_KEYS.access);
    write(STORAGE_KEYS.access, [...raw, newEntry]);
    return newEntry;
  }

  async revokeAccess(entryId: string): Promise<void> {
    const raw = read<DocumentAccessEntry>(STORAGE_KEYS.access);
    write(STORAGE_KEYS.access, raw.filter(e => e.id !== entryId));
  }

  // ── Approvals ─────────────────────────────────────────────────────────────

  async listApprovals(documentId: string, versionId: string): Promise<DocumentApprovalStep[]> {
    return read<DocumentApprovalStep>(STORAGE_KEYS.approvals).filter(
      a => a.document_id === documentId && a.version_id === versionId,
    );
  }

  async submitApproval(step: Omit<DocumentApprovalStep, "id">): Promise<DocumentApprovalStep> {
    const newStep: DocumentApprovalStep = { ...step, id: uuid() };
    const raw = read<DocumentApprovalStep>(STORAGE_KEYS.approvals);
    write(STORAGE_KEYS.approvals, [...raw, newStep]);
    return newStep;
  }
}
