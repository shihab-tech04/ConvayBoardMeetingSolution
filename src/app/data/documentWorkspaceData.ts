import { createEntityRegistry } from "../hooks/useEntityRegistry";
import type { EntityRecord } from "../hooks/useEntityRegistry";

// ── Comment thread ─────────────────────────────────────────────────────────────

export interface CommentReply {
  id: string;
  thread_id: string;
  author: string;
  body: string;
  created_at: string;
  mentions: string[];
}

export interface DocumentCommentThread extends EntityRecord {
  thread_id: string;
  document_id: string;
  version_id?: string;
  /** Legacy text-range anchor for rich-text editor (kept for compatibility). */
  anchor?: string;
  selected_text?: string;
  status: "open" | "resolved" | "reopened";
  created_by: string;
  created_at: string;
  body: string;
  replies: CommentReply[];
  assignee?: string;
  due_date?: string;
  mentions: string[];

  /** Structured anchor type for PDF and spreadsheet comments. */
  anchor_type?:
    | "text-range"
    | "pdf-text"
    | "pdf-region"
    | "spreadsheet-cell"
    | "spreadsheet-range";

  anchor_data?: {
    page?: number;
    rect?: { x: number; y: number; width: number; height: number };
    selectedText?: string;
    sheetId?: string;
    sheetName?: string;
    startCell?: string;
    endCell?: string;
    cellValuePreview?: string;
  };
}

// ── Access grant ───────────────────────────────────────────────────────────────

export interface DocumentAccessGrant extends EntityRecord {
  grant_id: string;
  document_id: string;
  subject_type: "user" | "role" | "group";
  subject_id: string;
  subject_label: string;
  permission: "view" | "comment" | "edit" | "admin";
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  note?: string;
}

// ── Approval record ────────────────────────────────────────────────────────────

export interface DocumentApproval extends EntityRecord {
  approval_id: string;
  document_id: string;
  version_id: string;
  stage: string;
  approver: string;
  approver_role: string;
  decision: "approved" | "rejected" | "pending";
  comment?: string;
  decided_at?: string;
  requested_at: string;
  requested_by: string;
}

// ── Board Pack document link ───────────────────────────────────────────────────

export interface BoardPackDocumentLink extends EntityRecord {
  link_id: string;
  board_pack_id: string;
  document_id: string;
  /** The specific document version captured at the time of linking. */
  linked_version_id: string;
  document_name: string;
  board_pack_name: string;
  section?: string;
  sort_order?: number;
  added_by: string;
  added_at: string;
  link_status: "active" | "superseded" | "removed";
  is_primary?: boolean;
}

// ── Document acknowledgement ───────────────────────────────────────────────────

export interface DocumentAcknowledgement extends EntityRecord {
  ack_id: string;
  document_id: string;
  document_name: string;
  acknowledged_by: string;
  acknowledged_at: string;
  version_id?: string;
  note?: string;
}

// ── Registry hooks ─────────────────────────────────────────────────────────────

const NOW_ISO = new Date().toISOString();

const SEED_DOC_COMMENT_THREADS: DocumentCommentThread[] = [
  // Annual Budget 2026-27 (doc id "1")
  {
    id: "dct-001", thread_id: "dct-001", document_id: "1",
    body: "The capex allocation for IT infrastructure looks conservative given the digital transformation roadmap. Should we discuss increasing this by ৳20 crore?",
    status: "open", created_by: "Mr. Md. Nurul Amin", created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    mentions: [], replies: [
      { id: "dct-001-r1", thread_id: "dct-001", author: "Ms. Nasrin Sultana", body: "Agreed. The digital channels budget in particular seems tight for the planned ATM rollout.", created_at: new Date(Date.now() - 2 * 3600000).toISOString(), mentions: [] },
      { id: "dct-001-r2", thread_id: "dct-001", author: "CFO", body: "We can revisit this in Q2 if the loan book grows as projected. A supplementary capex request is straightforward.", created_at: new Date(Date.now() - 1 * 3600000).toISOString(), mentions: [] },
    ],
  },
  {
    id: "dct-002", thread_id: "dct-002", document_id: "1",
    body: "The contingency reserve of ৳75 crore — is this sufficient given the current NPL trend in the sector?",
    status: "open", created_by: "Mr. Md. Abul Bashar", created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    mentions: [], replies: [],
  },
  // Board Remuneration Policy (doc id "10")
  {
    id: "dct-003", thread_id: "dct-003", document_id: "10",
    body: "The 20% increase in base retainer — has this been benchmarked against the listed bank peer group specifically, or the broader financial sector?",
    status: "open", created_by: "Mr. Abdul Awal Mintoo", created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    mentions: [], replies: [
      { id: "dct-003-r1", thread_id: "dct-003", author: "Company Secretary", body: "The benchmark covers the top 8 listed banks by assets. We can circulate the full benchmarking report if helpful.", created_at: new Date(Date.now() - 4 * 3600000).toISOString(), mentions: [] },
    ],
  },
  {
    id: "dct-004", thread_id: "dct-004", document_id: "10",
    body: "Section 3.2 — the cap of two committees per director should be reviewed. Some directors serve on three due to quorum constraints.",
    status: "resolved", created_by: "Ms. Nasrin Sultana", created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    mentions: [], replies: [
      { id: "dct-004-r1", thread_id: "dct-004", author: "Mr. Abdul Awal Mintoo", body: "Agreed — let us retain the cap but add an exception clause subject to Board approval.", created_at: new Date(Date.now() - 20 * 3600000).toISOString(), mentions: [] },
    ],
  },
];

export const useDocumentCommentRegistry = createEntityRegistry<DocumentCommentThread>(
  "bms.doc.threads",
  "bms:doc-threads-updated",
  SEED_DOC_COMMENT_THREADS,
);

export const useDocumentAccessRegistry = createEntityRegistry<DocumentAccessGrant>(
  "bms.doc.access_grants",
  "bms:doc-access-grants-updated",
  [],
);

export const useDocumentApprovalRegistry = createEntityRegistry<DocumentApproval>(
  "bms.doc.approvals_v2",
  "bms:doc-approvals-v2-updated",
  [],
);

export const useBoardPackDocumentLinkRegistry = createEntityRegistry<BoardPackDocumentLink>(
  "bms.doc.pack_links",
  "bms:doc-pack-links-updated",
  [],
);

export const useDocumentAcknowledgementRegistry = createEntityRegistry<DocumentAcknowledgement>(
  "bms.doc.acknowledgements",
  "bms:doc-acknowledgements-updated",
  [],
);
