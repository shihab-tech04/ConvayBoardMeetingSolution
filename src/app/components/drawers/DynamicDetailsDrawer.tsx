import { useMemo, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge } from "../badges/StatusBadge";
import { ResponsiveOverlay } from "../shared/ResponsiveOverlay";
import { SafeText, ExpandableText } from "../shared/SafeText";
import { AttachmentList } from "../attachments/AttachmentList";
import { type AttachmentItem, isAttachmentArray } from "../attachments/attachmentTypes";
import { CopyValueButton, isCopyableField } from "../shared/CopyValueButton";

interface ColumnDef {
  key: string;
  label: string;
  labelKey?: string;
  groupLabel?: string;
  groupLabelKey?: string;
}

import type { TableRow } from "../../pages/modulePageUtils";

interface DynamicDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  columns: ColumnDef[];
  rowData: TableRow | null;
  excludeKeys?: string[];
  showActions?: boolean;
  /** Extra action buttons appended to the drawer footer (e.g. Edit/Delete for custom records) */
  extraFooterActions?: ReactNode;
  /** Overflow actions shown in a "More" dropdown in the drawer footer */
  moreFooterActions?: Array<{ label: string; onClick: () => void; danger?: boolean }>;
  /** Key in rowData whose value renders as a subtitle under the name in the summary card */
  summarySubtitleKey?: string;
  /**
   * Optional back-navigation button rendered at the top of the drawer body.
   * Use when the drawer switches between parent → child views.
   */
  backAction?: { label: string; onClick: () => void };
  /**
   * Extra JSX rendered after the auto-grouped column sections.
   * Useful for custom agenda-specific content (child lists, approval history, etc.)
   * without creating a separate drawer component.
   */
  extraBodyContent?: ReactNode;
}

// ── Action / UI-only keys — never shown as data ──────────────────────────────
const UI_KEY_FRAGMENTS = [
  "actions", "action", "more", "see_more", "edit", "delete",
  "view", "details", "print", "download", "menu",
  "__actions__", "__more__", "__edit__", "__delete__", "__view__",
];

// ── Status summary block helpers ─────────────────────────────────────────────
const isStatusKey = (k: string) =>
  k === "status" || k.endsWith("_status");

const isIdentifierKey = (k: string) =>
  ["meeting_id", "meeting_ref", "meeting_number", "agenda_id", "agenda_no",
   "document_id", "document_no", "board_pack_id", "decision_id", "resolution_no",
   "action_id", "question_id", "body_id", "unit_id", "employee_id", "role_id",
   "workflow_id", "template_id", "integration_id",
   "user_id", "ref_no", "id"].includes(k) ||
  k.endsWith("_id") || k.endsWith("_no") || k.endsWith("_ref");

const isNameKey = (k: string) =>
  ["meeting_title", "agenda_title", "document_name", "board_pack_title",
   "decision_title", "resolution_title", "action_title", "question",
   "body_name", "unit_name", "user_name", "name", "group_name",
   "workflow_name", "template_name", "rule_name", "integration_name"].includes(k) ||
  k.endsWith("_title") || k.endsWith("_name");

const isSummaryDateKey = (k: string) =>
  ["meeting_date", "scheduled_date", "start_date", "due_date",
   "submission_date", "approval_date", "updated_at", "created_at",
   "publication_date"].includes(k);

// ── Auto-grouping patterns — checked in order, first match wins ──────────────
interface AutoGroup {
  label: string;
  groupKey: string;
  test: (k: string) => boolean;
}

const AUTO_GROUPS: AutoGroup[] = [
  {
    label: "Meeting Information",
    groupKey: "groups.meetingInfo",
    test: k =>
      ["meeting_type", "meeting_mode", "governance_body", "committee", "venue",
       "virtual_link", "chairperson", "meeting_secretary", "organizer",
       "quorum", "confidentiality", "category", "type"].includes(k) ||
      k.startsWith("meeting_") || k.includes("meeting_type"),
  },
  {
    label: "Governance Body & Scope",
    groupKey: "groups.governanceBody",
    test: k =>
      ["body_type", "body_status", "quorum_rule", "voting_method",
       "organization_scope", "division", "department", "region", "branch",
       "subsidiary"].includes(k) ||
      k.startsWith("body_") || k.startsWith("unit_") ||
      k.includes("governance") || k.includes("committee"),
  },
  {
    label: "Participants & Access",
    groupKey: "groups.participants",
    test: k =>
      ["participant_count", "attendees", "absentees", "proxies",
       "designation", "position", "organization_unit", "reports_to",
       "system_role", "assignment_type", "employment_status",
       "email", "phone", "level", "role"].includes(k) ||
      k.includes("participant") || k.includes("assigned_to") ||
      k.includes("submitted_by") || k.includes("presenter"),
  },
  {
    label: "Agenda & Documents",
    groupKey: "groups.agendaDocuments",
    test: k =>
      ["agenda_category", "purpose", "priority", "background",
       "proposed_decision", "document_type", "version", "file_size"].includes(k) ||
      k.startsWith("agenda_") || k.startsWith("document_") ||
      k.includes("board_pack"),
  },
  {
    label: "Decision & Follow-up",
    groupKey: "groups.decisionFollowup",
    test: k =>
      ["voting_result", "implementation_status", "effective_date",
       "responsible_owner", "decision_owner", "action_status",
       "progress", "due_date", "response_status"].includes(k) ||
      k.startsWith("decision_") || k.startsWith("resolution_") ||
      k.startsWith("action_") || k.includes("follow_up"),
  },
  {
    label: "Organization Assignment",
    groupKey: "groups.orgAssignment",
    test: k =>
      ["user_id", "employee_id", "acting_for", "delegation",
       "head", "parent_unit", "active_users"].includes(k) ||
      k.startsWith("org_") || k.includes("organization"),
  },
  {
    label: "Review & Approval",
    groupKey: "groups.reviewApproval",
    test: k =>
      k.includes("approval") || k.includes("review") || k.includes("verified") ||
      k.includes("approved_by") || k.includes("reviewer") ||
      k === "method" || k === "reason" || k === "remarks",
  },
  {
    label: "Financial Information",
    groupKey: "groups.financial",
    test: k =>
      k.includes("amount") || k.includes("budget") || k.includes("revenue") ||
      k.includes("payment") || k.includes("paid") || k.includes("outstanding") ||
      k.includes("credit") || k.includes("debit") || k.includes("balance") ||
      k.includes("financial_impact") || k.includes("resource_impact"),
  },
  {
    label: "Dates & Activity",
    groupKey: "groups.dates",
    test: k =>
      k.includes("_date") || k === "created_at" || k === "updated_at" ||
      k.includes("last_") || k.includes("_at"),
  },
  {
    label: "Security & Access",
    groupKey: "groups.securityActivity",
    test: k =>
      k.includes("login") || k.includes("session") || k.includes("password") ||
      k.includes("2fa") || k.includes("failed_login") || k.includes("access_level"),
  },
];

// Keys whose values are long — span full grid width
const WIDE_KEY_PATTERNS = [
  "summary", "remarks", "notes", "description", "address",
  "last_action", "activity_summary", "reason", "message", "details",
  "endpoint", "api_endpoint", "url", "link", "email",
];
const isWide = (k: string) => WIDE_KEY_PATTERNS.some(p => k.includes(p));

// Keys that should use ExpandableText with generous limits
const EXPANDABLE_KEYS = new Set([
  "description", "remarks", "notes", "address", "reason",
  "message", "details", "summary", "activity_summary", "last_action",
  "endpoint", "api_endpoint", "url", "link", "email",
]);
const isExpandable = (k: string) =>
  EXPANDABLE_KEYS.has(k) || EXPANDABLE_KEYS.has(k.replace(/_/g, "")) ||
  k.includes("description") || k.includes("remark") || k.includes("endpoint") ||
  k.includes("email") || k.includes("address") || k.includes("reason") ||
  k.includes("url") || k.includes("summary");

// Attachment metadata keys — excluded from normal field rendering
const ATTACHMENT_META_KEYS = new Set([
  "attachments", "attachment_count", "attachment_names", "source_file",
  "uploaded_files", "file_names", "file_count", "file_upload", "document_names",
]);
const isAttachmentMetadataKey = (k: string) =>
  ATTACHMENT_META_KEYS.has(k) ||
  k.endsWith("_attachments") ||
  k === "attachment_files";

function extractAttachments(rowData: TableRow): AttachmentItem[] {
  // 1. Direct attachment array on known keys
  for (const key of ["attachments", "uploaded_files", "attachment_files"]) {
    if (isAttachmentArray(rowData[key])) return rowData[key] as AttachmentItem[];
  }
  // 2. Any key ending with _attachments
  for (const [k, v] of Object.entries(rowData)) {
    if (k.endsWith("_attachments") && isAttachmentArray(v)) return v as AttachmentItem[];
  }
  // 3. Metadata-only fallback: build from attachment_names or source_file
  const names = rowData["attachment_names"] ?? rowData["file_names"] ?? rowData["document_names"];
  const sourceFile = rowData["source_file"];
  const items: AttachmentItem[] = [];
  if (typeof names === "string" && names.trim()) {
    names.split(",").forEach((n, i) => {
      const name = n.trim();
      const ext = "." + (name.split(".").pop()?.toLowerCase() ?? "bin");
      items.push({ id: `meta-${i}`, name, size: 0, sizeLabel: "—", type: "", extension: ext, previewKind: "unknown" });
    });
  } else if (typeof sourceFile === "string" && sourceFile.trim()) {
    const ext = "." + (sourceFile.split(".").pop()?.toLowerCase() ?? "bin");
    items.push({ id: "meta-0", name: sourceFile.trim(), size: 0, sizeLabel: "—", type: "", extension: ext, previewKind: "unknown" });
  }
  return items;
}

// Returns true when a value should be treated as empty
const isEmpty = (val: unknown): boolean => {
  if (val === null || val === undefined || val === "" || val === "—") return true;
  if (Array.isArray(val)) return val.length === 0;
  if (val !== null && typeof val === "object") return Object.keys(val as object).length === 0;
  return false;
};

// Given an ordered list of columns, compute whether each should span 2 cols.
// Wide keys always span 2. A normal key spans 2 when it would be alone in its row.
const computeSpans = (cols: ColumnDef[]): boolean[] => {
  const spans: boolean[] = new Array(cols.length).fill(false);
  let gridCol = 0; // 0 = left, 1 = right

  for (let i = 0; i < cols.length; i++) {
    if (isWide(cols[i].key)) {
      spans[i] = true;
      gridCol = 0;
      continue;
    }
    // Would the next normal (non-wide) item exist in the same row?
    const nextNormal = cols.slice(i + 1).find(c => !isWide(c.key));
    const isAlone = gridCol === 0 && !nextNormal;
    if (isAlone) {
      spans[i] = true;
      gridCol = 0;
    } else {
      spans[i] = false;
      gridCol = (gridCol + 1) % 2;
      // Wide item after this would reset the column on next iteration
    }
  }
  return spans;
};

// ── Component ────────────────────────────────────────────────────────────────
export function DynamicDetailsDrawer({
  open,
  onClose,
  title,
  columns,
  rowData,
  excludeKeys = [],
  showActions = true,
  extraFooterActions,
  moreFooterActions,
  summarySubtitleKey,
  backAction,
  extraBodyContent,
}: DynamicDetailsDrawerProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  // ── Heavy section-building — memoized on rowData + columns ───────────────
  // Must be called before any early return to satisfy Rules of Hooks.
  type GroupEntry = { label: string; labelKey?: string; cols: ColumnDef[] };
  const { statusCol, identifierCol, nameCol, dateCol, groupMap, attachments } = useMemo(() => {
    const empty = { statusCol: undefined, identifierCol: undefined, nameCol: undefined, dateCol: undefined, groupMap: new Map<string, GroupEntry>(), attachments: [] as AttachmentItem[] };
    if (!rowData) return empty;
    const attachments = extractAttachments(rowData);
    const allExclude = [...UI_KEY_FRAGMENTS, ...excludeKeys];
    const validColumns = columns.filter(col => {
      if (allExclude.some(x => col.key.toLowerCase().includes(x.toLowerCase()))) return false;
      if (isAttachmentMetadataKey(col.key)) return false; // rendered via AttachmentList
      return !isEmpty(rowData[col.key]);
    });

    const statusCol     = validColumns.find(c => isStatusKey(c.key));
    const identifierCol = validColumns.find(c => isIdentifierKey(c.key));
    const nameCol       = validColumns.find(c => isNameKey(c.key));
    const dateCol       = validColumns.find(c => isSummaryDateKey(c.key));
    const summaryKeySet = new Set(
      [statusCol, identifierCol, nameCol, dateCol].filter(Boolean).map(c => c!.key),
    );
    // Also exclude the subtitle key so it's not repeated in section cards
    if (summarySubtitleKey) summaryKeySet.add(summarySubtitleKey);

    const groupMap = new Map<string, GroupEntry>();
    const addToGroup = (groupLabel: string, groupLabelKey: string | undefined, col: ColumnDef) => {
      if (!groupMap.has(groupLabel))
        groupMap.set(groupLabel, { label: groupLabel, labelKey: groupLabelKey, cols: [] });
      groupMap.get(groupLabel)!.cols.push(col);
    };

    for (const col of validColumns) {
      if (summaryKeySet.has(col.key)) continue;
      if (col.groupLabel) {
        addToGroup(col.groupLabel, col.groupLabelKey, col);
      } else {
        const match = AUTO_GROUPS.find(g => g.test(col.key));
        addToGroup(match?.label ?? "Other Information", match?.groupKey ?? "groups.otherInfo", col);
      }
    }

    return { statusCol, identifierCol, nameCol, dateCol, groupMap, attachments };
  // rowData may be null — the memo handles it safely by returning empty defaults
  }, [rowData, columns, excludeKeys]);

  if (!rowData) return null;

  const getLabel = (col: ColumnDef): string => col.label;

  const drawerTitle = title || "Details";

  const hasMore = moreFooterActions && moreFooterActions.length > 0;
  const footerContent = (extraFooterActions || hasMore) ? (
    <>
      {extraFooterActions}
      {hasMore && (
        <div ref={moreRef} style={{ position: "relative", marginLeft: extraFooterActions ? "0.5rem" : "auto" }}>
          <button
            type="button"
            onClick={() => setMoreOpen(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.75rem", borderRadius: "var(--radius, 6px)", background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: "pointer", fontSize: "0.82rem", color: "var(--color-text)", fontWeight: 500 }}
            aria-haspopup="true"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={15} />
            More
          </button>
          {moreOpen && (
            <div
              style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, minWidth: 180, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius, 6px)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, overflow: "hidden" }}
              role="menu"
            >
              {moreFooterActions!.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  onClick={() => { setMoreOpen(false); action.onClick(); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 1rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", color: action.danger ? "var(--color-error, #ef4444)" : "var(--color-text)", fontWeight: action.danger ? 500 : 400 }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  ) : undefined;

  const hasSummary = !!(statusCol || identifierCol || nameCol);

  return (
    <ResponsiveOverlay
      open={open}
      onClose={onClose}
      title={drawerTitle}
      footer={footerContent}
      closeLabel="Close details"
      describedBy={hasSummary ? "dynamic-drawer-summary" : undefined}
      className="dynamic-drawer"
    >
      {/* ── Back navigation ───────────────────────────────────────────── */}
      {backAction && (
        <button
          type="button"
          onClick={backAction.onClick}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontSize: "0.8rem", color: "var(--color-primary)",
            padding: "0 0 12px", fontWeight: 500,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {backAction.label}
        </button>
      )}
      {/* ── Status Summary Block ───────────────────────────────────────── */}
      {(statusCol || identifierCol || nameCol) && (
        <div id="dynamic-drawer-summary" className="drawer-summary">
          <div className="drawer-summary__main">
            {nameCol && (
              <ExpandableText
                value={rowData[nameCol.key]}
                maxChars={120}
                collapsedLines={3}
                mode="block"
                className="drawer-summary__name"
                as="p"
              />
            )}
            {summarySubtitleKey && rowData[summarySubtitleKey] && (
              <ExpandableText
                value={rowData[summarySubtitleKey]}
                maxChars={140}
                collapsedLines={2}
                mode="block"
                className="drawer-summary__subtitle"
                as="p"
              />
            )}
            {identifierCol && (
              <p className="drawer-summary__id">
                <span className="drawer-summary__id-label">{getLabel(identifierCol)}: </span>
                <SafeText value={rowData[identifierCol.key]} mode="break" as="span" />
              </p>
            )}
            {dateCol && (
              <p className="drawer-summary__meta">
                {getLabel(dateCol)}: <SafeText value={rowData[dateCol.key]} mode="break" as="span" />
              </p>
            )}
          </div>
          {statusCol && (
            <div className="drawer-summary__status">
              <StatusBadge value={String(rowData[statusCol.key])} />
            </div>
          )}
        </div>
      )}

      {/* ── Attached Files ────────────────────────────────────────────── */}
      {attachments && attachments.length > 0 && (
        <AttachmentList attachments={attachments} />
      )}

      {/* ── Grouped Sections ──────────────────────────────────────────── */}
      {[...groupMap.values()].map(group => {
        if (group.cols.length === 0) return null;
        const groupLabel = group.label;

        return (
          <div key={group.label} className="detail-section">
            <h3 className="detail-section__head detail-section__head--static">
              {groupLabel}
            </h3>
            <div className="drawer-field-grid">
              {computeSpans(group.cols).map((fullWidth, idx) => {
                const col = group.cols[idx];
                return (
                  <div
                    key={col.key}
                    className={`drawer-field${fullWidth ? " drawer-field--wide" : ""}`}
                  >
                    <span className="drawer-field__label">{getLabel(col)}</span>
                    <div className="drawer-field__value">
                      {isStatusKey(col.key) ? (
                        <StatusBadge value={String(rowData[col.key])} />
                      ) : (
                        <div className="drawer-field__value-row">
                          {isExpandable(col.key)
                            ? <ExpandableText value={rowData[col.key]} maxChars={160} collapsedLines={4} mode="block" />
                            : <SafeText value={rowData[col.key]} mode="break" as="span" />
                          }
                          {isCopyableField(col.key) && (
                            <CopyValueButton value={rowData[col.key]} label={getLabel(col)} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Extra body content (agenda child list, approval history, etc.) ── */}
      {extraBodyContent}
    </ResponsiveOverlay>
  );
}
