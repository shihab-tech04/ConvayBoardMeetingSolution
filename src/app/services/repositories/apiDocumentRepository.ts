import type { BoardDocument, DocumentVersion } from "../../data/boardMeetingData";
import type {
  DocumentRepository,
  DocumentListOptions,
  Page,
  DocumentComment,
  DocumentAccessEntry,
  DocumentApprovalStep,
} from "../types/documents";
import { apiRequest, apiUpload } from "../api/client";

export class ApiDocumentRepository implements DocumentRepository {
  async list(opts: DocumentListOptions = {}): Promise<Page<BoardDocument>> {
    return apiRequest<Page<BoardDocument>>("/documents", {
      params: {
        page:             opts.page,
        pageSize:         opts.pageSize,
        search:           opts.search,
        doc_type:         opts.doc_type,
        approval_status:  opts.approval_status,
        related_meeting:  opts.related_meeting,
        folder_id:        opts.folder_id,
        is_template:      opts.is_template,
        sortBy:           opts.sortBy as string,
        sortDir:          opts.sortDir,
      },
    });
  }

  async getById(id: string): Promise<BoardDocument | undefined> {
    return apiRequest<BoardDocument>(`/documents/${id}`);
  }

  async create(doc: Omit<BoardDocument, "id" | "doc_id" | "created_at">): Promise<BoardDocument> {
    return apiRequest<BoardDocument>("/documents", { method: "POST", body: doc });
  }

  async update(id: string, patch: Partial<BoardDocument>): Promise<BoardDocument> {
    return apiRequest<BoardDocument>(`/documents/${id}`, { method: "PATCH", body: patch });
  }

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/documents/${id}`, { method: "DELETE" });
  }

  async listVersions(documentId: string): Promise<DocumentVersion[]> {
    return apiRequest<DocumentVersion[]>(`/documents/${documentId}/versions`);
  }

  async getVersion(versionId: string): Promise<DocumentVersion | undefined> {
    return apiRequest<DocumentVersion>(`/document-versions/${versionId}`);
  }

  async createVersion(ver: Omit<DocumentVersion, "id" | "version_id" | "created_at">): Promise<DocumentVersion> {
    return apiRequest<DocumentVersion>(`/documents/${ver.document_id}/versions`, { method: "POST", body: ver });
  }

  async updateVersion(versionId: string, patch: Partial<DocumentVersion>): Promise<DocumentVersion> {
    return apiRequest<DocumentVersion>(`/document-versions/${versionId}`, { method: "PATCH", body: patch });
  }

  async listComments(documentId: string, versionId?: string): Promise<DocumentComment[]> {
    return apiRequest<DocumentComment[]>(`/documents/${documentId}/comments`, {
      params: { version_id: versionId },
    });
  }

  async addComment(comment: Omit<DocumentComment, "id" | "created_at">): Promise<DocumentComment> {
    return apiRequest<DocumentComment>(`/documents/${comment.document_id}/comments`, {
      method: "POST",
      body: comment,
    });
  }

  async resolveComment(commentId: string): Promise<void> {
    await apiRequest<void>(`/document-comments/${commentId}/resolve`, { method: "POST" });
  }

  async deleteComment(commentId: string): Promise<void> {
    await apiRequest<void>(`/document-comments/${commentId}`, { method: "DELETE" });
  }

  async listAccess(documentId: string): Promise<DocumentAccessEntry[]> {
    return apiRequest<DocumentAccessEntry[]>(`/documents/${documentId}/access`);
  }

  async grantAccess(entry: Omit<DocumentAccessEntry, "id" | "granted_at">): Promise<DocumentAccessEntry> {
    return apiRequest<DocumentAccessEntry>(`/documents/${entry.document_id}/access`, {
      method: "POST",
      body: entry,
    });
  }

  async revokeAccess(entryId: string): Promise<void> {
    await apiRequest<void>(`/document-access/${entryId}`, { method: "DELETE" });
  }

  async listApprovals(documentId: string, versionId: string): Promise<DocumentApprovalStep[]> {
    return apiRequest<DocumentApprovalStep[]>(`/documents/${documentId}/versions/${versionId}/approvals`);
  }

  async submitApproval(step: Omit<DocumentApprovalStep, "id">): Promise<DocumentApprovalStep> {
    return apiRequest<DocumentApprovalStep>(
      `/documents/${step.document_id}/versions/${step.version_id}/approvals`,
      { method: "POST", body: step },
    );
  }

  // ── File upload helper ────────────────────────────────────────────────────

  async uploadFile(documentId: string, file: File, meta: Record<string, string> = {}): Promise<{ file_ref: string }> {
    const form = new FormData();
    form.append("file", file);
    Object.entries(meta).forEach(([k, v]) => form.append(k, v));
    return apiUpload<{ file_ref: string }>(`/documents/${documentId}/upload`, form);
  }
}
