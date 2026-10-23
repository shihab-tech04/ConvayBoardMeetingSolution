import type { BoardDocument, DocumentVersion } from "../../data/boardMeetingData";
import type {
  Page,
  DocumentListOptions,
  DocumentComment,
  DocumentAccessEntry,
  DocumentApprovalStep,
} from "../types/documents";

// ── Typed API contracts for document endpoints ────────────────────────────────
// These describe the shapes the backend is expected to produce / consume.
// They are not yet wired to live calls — the local repository handles all
// current data. Connect these when a backend becomes available.

export interface CreateDocumentRequest {
  doc_name: string;
  doc_type: string;
  related_meeting?: string;
  related_agenda?: string;
  owner?: string;
  version?: string;
  confidentiality?: string;
  effective_date?: string;
  expiry_date?: string;
  acknowledgement_required?: string;
  description?: string;
  tags?: string;
  folder_id?: string;
}

export interface UpdateDocumentRequest extends Partial<CreateDocumentRequest> {
  approval_status?: string;
  workflow_status?: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  is_locked?: boolean;
}

export interface UploadDocumentFileRequest {
  document_id: string;
  version_label?: string;
  change_summary?: string;
}

export interface UploadDocumentFileResponse {
  file_ref: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  version_id: string;
}

export interface CreateVersionRequest {
  document_id: string;
  version_name?: string;
  change_summary: string;
  snapshot_type?: "manual" | "publish";
  content_ref?: string;
  original_file_ref?: string;
}

export interface GrantAccessRequest {
  document_id: string;
  subject_type: DocumentAccessEntry["subject_type"];
  subject_id: string;
  permission: DocumentAccessEntry["permission"];
  expires_at?: string;
}

export interface SubmitApprovalRequest {
  document_id: string;
  version_id: string;
  approver: string;
  status: DocumentApprovalStep["status"];
  notes?: string;
}

// ── Expected endpoint paths ───────────────────────────────────────────────────

export const DOCUMENT_ENDPOINTS = {
  list:             "/documents",
  getById:          (id: string)                             => `/documents/${id}`,
  create:           "/documents",
  update:           (id: string)                             => `/documents/${id}`,
  remove:           (id: string)                             => `/documents/${id}`,
  upload:           (id: string)                             => `/documents/${id}/upload`,
  listVersions:     (documentId: string)                     => `/documents/${documentId}/versions`,
  createVersion:    (documentId: string)                     => `/documents/${documentId}/versions`,
  getVersion:       (versionId: string)                      => `/document-versions/${versionId}`,
  updateVersion:    (versionId: string)                      => `/document-versions/${versionId}`,
  listComments:     (documentId: string)                     => `/documents/${documentId}/comments`,
  addComment:       (documentId: string)                     => `/documents/${documentId}/comments`,
  resolveComment:   (commentId: string)                      => `/document-comments/${commentId}/resolve`,
  deleteComment:    (commentId: string)                      => `/document-comments/${commentId}`,
  listAccess:       (documentId: string)                     => `/documents/${documentId}/access`,
  grantAccess:      (documentId: string)                     => `/documents/${documentId}/access`,
  revokeAccess:     (entryId: string)                        => `/document-access/${entryId}`,
  listApprovals:    (documentId: string, versionId: string)  => `/documents/${documentId}/versions/${versionId}/approvals`,
  submitApproval:   (documentId: string, versionId: string)  => `/documents/${documentId}/versions/${versionId}/approvals`,
} as const;

// ── Type re-exports for convenience ──────────────────────────────────────────

export type {
  BoardDocument,
  DocumentVersion,
  Page,
  DocumentListOptions,
  DocumentComment,
  DocumentAccessEntry,
  DocumentApprovalStep,
};
