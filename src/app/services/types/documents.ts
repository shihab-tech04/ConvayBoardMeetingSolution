import type { BoardDocument, DocumentVersion } from "../../data/boardMeetingData";

// ── Paginated result ──────────────────────────────────────────────────────────

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Filter / sort options ─────────────────────────────────────────────────────

export interface DocumentListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  doc_type?: string;
  approval_status?: string;
  related_meeting?: string;
  folder_id?: string;
  tags?: string[];
  is_template?: boolean;
  sortBy?: keyof BoardDocument;
  sortDir?: "asc" | "desc";
}

// ── Comment ───────────────────────────────────────────────────────────────────

export interface DocumentComment {
  id: string;
  document_id: string;
  version_id?: string;
  author: string;
  body: string;
  resolved: boolean;
  created_at: string;
  updated_at?: string;
}

// ── Access entry ──────────────────────────────────────────────────────────────

export interface DocumentAccessEntry {
  id: string;
  document_id: string;
  subject_type: "user" | "role" | "group";
  subject_id: string;
  permission: "view" | "comment" | "edit" | "admin";
  granted_by: string;
  granted_at: string;
  expires_at?: string;
}

// ── Approval step ─────────────────────────────────────────────────────────────

export interface DocumentApprovalStep {
  id: string;
  document_id: string;
  version_id: string;
  approver: string;
  status: "pending" | "approved" | "rejected" | "delegated";
  notes?: string;
  decided_at?: string;
}

// ── Repository interface ──────────────────────────────────────────────────────

export interface DocumentRepository {
  // Documents
  list(options?: DocumentListOptions): Promise<Page<BoardDocument>>;
  getById(id: string): Promise<BoardDocument | undefined>;
  create(doc: Omit<BoardDocument, "id" | "doc_id" | "created_at">): Promise<BoardDocument>;
  update(id: string, patch: Partial<BoardDocument>): Promise<BoardDocument>;
  remove(id: string): Promise<void>;

  // Versions
  listVersions(documentId: string): Promise<DocumentVersion[]>;
  getVersion(versionId: string): Promise<DocumentVersion | undefined>;
  createVersion(version: Omit<DocumentVersion, "id" | "version_id" | "created_at">): Promise<DocumentVersion>;
  updateVersion(versionId: string, patch: Partial<DocumentVersion>): Promise<DocumentVersion>;

  // Comments
  listComments(documentId: string, versionId?: string): Promise<DocumentComment[]>;
  addComment(comment: Omit<DocumentComment, "id" | "created_at">): Promise<DocumentComment>;
  resolveComment(commentId: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;

  // Access
  listAccess(documentId: string): Promise<DocumentAccessEntry[]>;
  grantAccess(entry: Omit<DocumentAccessEntry, "id" | "granted_at">): Promise<DocumentAccessEntry>;
  revokeAccess(entryId: string): Promise<void>;

  // Approvals
  listApprovals(documentId: string, versionId: string): Promise<DocumentApprovalStep[]>;
  submitApproval(step: Omit<DocumentApprovalStep, "id">): Promise<DocumentApprovalStep>;
}

// ── Content store types ───────────────────────────────────────────────────────

export interface StoredContent {
  id: string;
  document_id: string;
  version_id?: string;
  content_type:
    | "editor_json"
    | "original_file"
    | "converted_html"
    | "version_snapshot"
    | "spreadsheet_workbook"
    | "spreadsheet_snapshot"
    | "pdf_annotations"
    | "pdf_annotation_snapshot";
  content: ArrayBuffer | string;
  mime_type?: string;
  file_name?: string;
  stored_at: string;
  size?: number;
}
