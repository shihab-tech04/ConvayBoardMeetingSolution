import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  FilePlus, FileText, BarChart2, Clock,
  Globe, MessageSquare, Eye, AlertCircle,
} from "lucide-react";
import { Button } from "../../components/buttons/Button";
import { StatCard } from "../../components/cards/StatCard";
import { UnifiedDataTable } from "../../components/tables/UnifiedDataTable";
import { DocumentDetailsDrawer } from "../../components/documents/DocumentDetailsDrawer";
import { DocumentComposerModal } from "../../components/documents/DocumentComposerModal";
import {
  useDocumentRegistry,
  useMeetingRegistry,
  useAgendaRegistry,
  useAgendaDocumentLinkRegistry,
  useGovernanceRegistry,
  DOCUMENT_TYPES,
  CONFIDENTIALITY_LEVELS,
  type BoardDocument,
} from "../../data/boardMeetingData";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { normalizeBoardDocument } from "../../utils/normalizeBoardDocument";
import type { ColDef, FilterDef, RowAction, TableRow } from "../modulePageUtils";

// ── Constants ──────────────────────────────────────────────────────────────────

const PER_PAGE   = 10;
const FILE_FORMATS      = ["PDF", "DOCX", "DOC", "XLSX", "XLS", "XLSM", "PPTX", "PPT", "ODT", "ODS", "RTF", "CSV", "TSV", "TXT"];
const WORKFLOW_STATUSES = ["Draft", "Under Review", "Changes Requested", "Pending Approval", "Approved", "Published", "Superseded", "Archived"];
const VIEW_ACTION: RowAction[] = [{ id: "view", label: "View", icon: Eye }];

const FILTER_PARAM_KEYS = [
  "doc_type", "file_format", "governance_body", "related_meeting", "owner",
  "confidentiality", "workflow_status", "access", "from", "to", "acknowledgement_required", "is_template",
  "has_unresolved_comments",
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFileExt(row: TableRow): string {
  const fn = String(row.file_name ?? "");
  if (fn) {
    const parts = fn.split(".");
    return parts.length > 1 ? parts.pop()!.toUpperCase() : "";
  }
  return String(row.file_format ?? "").toUpperCase().replace(".", "");
}

function formatDateShort(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function matchesSearch(row: BoardDocument, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  const fields = [
    row.doc_name, row.doc_number, row.file_name, row.doc_type,
    row.owner, row.related_meeting, row.related_agenda,
    row.tags, row.version, row.approval_status, row.workflow_status,
  ];
  return fields.some(f => f && String(f).toLowerCase().includes(lower));
}

function matchesFilters(
  row: BoardDocument,
  applied: Record<string, string>,
  user?: { name?: string; employeeId?: string },
): boolean {
  if (applied.doc_type && applied.doc_type !== "All Types" && row.doc_type !== applied.doc_type) return false;
  if (applied.file_format && applied.file_format !== "All") {
    const ext = String(row.file_name ?? row.file_format ?? "").toLowerCase().split(".").pop() ?? "";
    if (ext.toUpperCase() !== applied.file_format) return false;
  }
  if (applied.related_meeting && applied.related_meeting !== "All") {
    const id = applied.related_meeting.split(" — ")[0];
    if (!row.related_meeting.startsWith(id)) return false;
  }
  if (applied.owner && !String(row.owner).toLowerCase().includes(applied.owner.toLowerCase())) return false;
  if (applied.confidentiality && applied.confidentiality !== "All" && row.confidentiality !== applied.confidentiality) return false;
  if (applied.workflow_status && applied.workflow_status !== "All" && row.approval_status !== applied.workflow_status) return false;
  if (applied.access && applied.access !== "All Accessible" && user) {
    const isOwned = isOwnDocument(row, user);
    if (applied.access === "Owned by Me"   &&  isOwned === false) return false;
    if (applied.access === "Shared With Me" &&  isOwned === true)  return false;
  }
  if (applied.from && row.created_at < applied.from) return false;
  if (applied.to && row.created_at > applied.to + "T23:59:59") return false;
  if (applied.acknowledgement_required === "Yes" && row.acknowledgement_required !== "Yes") return false;
  if (applied.acknowledgement_required === "No" && row.acknowledgement_required !== "No") return false;
  if (applied.is_template === "Yes" && !row.is_template) return false;
  if (applied.is_template === "No" && row.is_template) return false;
  if (applied.has_unresolved_comments === "true" && !(row.unresolved_comment_count ?? 0)) return false;
  return true;
}

function isOwnDocument(row: BoardDocument, user: { name?: string; employeeId?: string }): boolean {
  return (
    (!!user.name       && row.owner      === user.name) ||
    (!!user.employeeId && row.created_by === user.employeeId)
  );
}

function matchesTab(
  row: BoardDocument,
  tabId: string,
  user: { name?: string; employeeId?: string },
  linkedDocIds?: Set<string>,
): boolean {
  const docId = row.doc_id ?? row.id;
  const isLinked = linkedDocIds ? linkedDocIds.has(docId) : !!(row.related_agenda);
  switch (tabId) {
    case "all":             return true;
    case "unassigned":      return !isLinked;
    case "linked-agenda":   return isLinked;
    case "my-documents":    return isOwnDocument(row, user);
    case "needs-attention": return row.approval_status === "Under Review" || row.approval_status === "Changes Requested";
    case "published":       return row.approval_status === "Published";
    case "archived":        return row.approval_status === "Archived";
    default:                return true;
  }
}

// ── DocCell ────────────────────────────────────────────────────────────────────

function DocCell({ row }: { row: TableRow }) {
  const name = String(row.doc_name ?? "—");
  const ref  = String(row.doc_id ?? row.doc_number ?? "");
  const fn   = String(row.file_name ?? "");
  const conf = String(row.confidentiality ?? "");
  const ext  = getFileExt(row);
  const sub  = [ref, fn].filter(Boolean).join(" · ");
  const isRestricted = conf === "Confidential" || conf === "Strictly Confidential";

  return (
    <div className="doc-cell">
      <span className="doc-cell__icon" aria-hidden="true">
        <FileText size={15} strokeWidth={1.5} />
      </span>
      <div className="doc-cell__body">
        <span className="doc-cell__name">{name}</span>
        {sub && <span className="doc-cell__sub">{sub}</span>}
      </div>
      {ext && <span className="doc-cell__ext" aria-label={`Format: ${ext}`}>{ext}</span>}
      {isRestricted && (
        <span className="doc-cell__conf" title={conf} aria-label={conf}>
          <AlertCircle size={11} strokeWidth={2} />
        </span>
      )}
    </div>
  );
}

// ── MeetingCell ────────────────────────────────────────────────────────────────

function MeetingCell({
  row,
  meetingItems,
  agendaItems,
}: {
  row: TableRow;
  meetingItems: Array<{ meeting_id: string; meeting_title: string }>;
  agendaItems:  Array<{ agenda_id: string; agenda_title: string }>;
}) {
  const mtgId = String(row.related_meeting ?? "");
  const agdId = String(row.related_agenda  ?? "");

  const meeting = mtgId ? meetingItems.find(m => m.meeting_id === mtgId || mtgId.startsWith(m.meeting_id)) : undefined;
  const agenda  = agdId ? agendaItems.find(a => a.agenda_id  === agdId  || agdId.startsWith(a.agenda_id))  : undefined;

  const mtgLabel = meeting?.meeting_title ?? mtgId ?? "—";
  const agdLabel = agenda?.agenda_title   ?? (agdId || null);

  if (!mtgLabel || mtgLabel === "—") return <span style={{ color: "var(--color-text-subtle, #9ca3af)" }}>—</span>;

  return (
    <div className="doc-cell__body">
      <span className="doc-cell__name" style={{ fontWeight: 500 }}>{mtgLabel}</span>
      {agdLabel && <span className="doc-cell__sub">{agdLabel}</span>}
    </div>
  );
}

// ── Tab empty labels ───────────────────────────────────────────────────────────

const TAB_EMPTY: Record<string, string> = {
  "all":              "No documents yet. Add a document to get started.",
  "my-documents":     "You have not created or own any documents yet.",
  "needs-attention":  "Nothing requires your attention right now.",
  "published":        "No published documents.",
  "archived":         "No archived documents.",
};

// ── Main component ─────────────────────────────────────────────────────────────

export function DocumentLibraryPage() {
  // ── Registries ──
  const registry        = useDocumentRegistry();
  const meetingReg      = useMeetingRegistry();
  const agendaReg       = useAgendaRegistry();
  const agendaLinkReg   = useAgendaDocumentLinkRegistry();
  const govReg          = useGovernanceRegistry();
  const currentUser     = useCurrentUser();

  // ── URL state ──
  const [searchParams, setSearchParams] = useSearchParams();
  const tab    = searchParams.get("tab")  ?? "all";
  const q      = searchParams.get("q")    ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const viewId = searchParams.get("view") ?? null;

  // Applied filters from URL params (f_<key>)
  const appliedFilters = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    FILTER_PARAM_KEYS.forEach(k => {
      const v = searchParams.get(`f_${k}`);
      if (v) out[k] = v;
    });
    return out;
  }, [searchParams]);

  // Pending filter values in local state — written to URL on Apply
  const [filterValues, setFilterValues] = useState<Record<string, string>>(appliedFilters);
  // Sync when navigating back/forward
  useEffect(() => { setFilterValues(appliedFilters); }, [JSON.stringify(appliedFilters)]);

  // ── Composer modal state ──
  const [composerOpen, setComposerOpen] = useState(false);

  // ── Data ──
  const items = useMemo(
    () => registry.items.map(d => normalizeBoardDocument(d as unknown as Record<string, unknown>)),
    [registry.items],
  );

  // Set of doc IDs that have at least one active agenda-document link
  const linkedDocIds = useMemo<Set<string>>(
    () => new Set(agendaLinkReg.items.map(l => l.document_id)),
    [agendaLinkReg.items],
  );

  // Stage 1: search + filter (no tab) — used for tab counts
  const searchFiltered = useMemo(
    () => items.filter(d => matchesSearch(d, q) && matchesFilters(d, appliedFilters, currentUser)),
    [items, q, appliedFilters, currentUser],
  );

  // Stage 2: apply active tab
  const tabFiltered = useMemo(
    () => searchFiltered.filter(d => matchesTab(d, tab, currentUser, linkedDocIds)),
    [searchFiltered, tab, currentUser, linkedDocIds],
  );

  // Stage 3: paginate
  const pageRows = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return tabFiltered.slice(start, start + PER_PAGE) as TableRow[];
  }, [tabFiltered, page]);

  // Clamp page on data change
  useEffect(() => {
    if (page <= 1) return;
    const max = Math.max(1, Math.ceil(tabFiltered.length / PER_PAGE));
    if (page > max) setSearchParams(p => { const n = new URLSearchParams(p); n.set("page", String(max)); return n; });
  }, [tabFiltered.length, page]);

  // ── Legacy tab URL migration ──
  useEffect(() => {
    const VALID_TABS = new Set(["all", "unassigned", "linked-agenda", "my-documents", "needs-attention", "published", "archived"]);
    if (VALID_TABS.has(tab)) return;
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      if (tab === "awaiting-review") {
        n.set("tab", "needs-attention");
      } else if (tab === "shared") {
        n.set("tab", "all");
        n.set("f_access", "Shared With Me");
      } else if (tab === "under-review") {
        n.set("tab", "all");
        n.set("f_workflow_status", "Under Review");
      } else if (tab === "draft") {
        n.set("tab", "all");
        n.set("f_workflow_status", "Draft");
      } else if (tab === "approved") {
        n.set("tab", "all");
        n.set("f_workflow_status", "Approved");
      } else if (tab === "templates") {
        n.set("tab", "all");
        // Open the composer in the calling context — just redirect to all for now
      } else {
        n.set("tab", "all");
      }
      n.set("page", "1");
      return n;
    }, { replace: true });
  }, [tab]);

  // ── Summary card counts ──
  const totalCount          = searchFiltered.length;
  const needsAttentionCount = searchFiltered.filter(d => d.approval_status === "Under Review" || d.approval_status === "Changes Requested").length;
  const publishedCount      = searchFiltered.filter(d => d.approval_status === "Published").length;
  const commentCount        = searchFiltered.reduce((s, d) => s + (d.unresolved_comment_count ?? 0), 0);

  // ── Tab definitions (7 primary tabs) ──
  const tabDefs = useMemo(() => {
    const cnt = (test: (d: BoardDocument) => boolean) => searchFiltered.filter(test).length;
    return [
      { id: "all",             label: "All Documents",      count: searchFiltered.length },
      { id: "unassigned",      label: "Unassigned",         count: cnt(d => !linkedDocIds.has(d.doc_id ?? d.id)) },
      { id: "linked-agenda",   label: "Attached to Agenda", count: cnt(d => linkedDocIds.has(d.doc_id ?? d.id)) },
      { id: "my-documents",    label: "My Documents",       count: cnt(d => isOwnDocument(d, currentUser)) },
      { id: "needs-attention", label: "Needs My Attention", count: cnt(d => d.approval_status === "Under Review" || d.approval_status === "Changes Requested") },
      { id: "published",       label: "Published",          count: cnt(d => d.approval_status === "Published") },
      { id: "archived",        label: "Archived",           count: cnt(d => d.approval_status === "Archived") },
    ];
  }, [searchFiltered, linkedDocIds]);

  // ── Drawer row (resolved from URL) ──
  // ── Drawer document (resolved from URL) ──
  const drawerDoc = useMemo<BoardDocument | null>(() => {
    if (!viewId) return null;
    return items.find(d => d.id === viewId || d.doc_id === viewId) ?? null;
  }, [viewId, items]);

  // ── Table columns ──
  const meetingItems = meetingReg.items;
  const agendaItems  = agendaReg.items;

  const cols = useMemo<ColDef[]>(() => [
    {
      type: "col",
      col: {
        key: "doc_name",
        label: "Document",
        truncate: "none",
        renderCell: (_v, row) => <DocCell row={row} />,
      },
    },
    {
      type: "col",
      col: {
        key: "related_meeting",
        label: "Meeting / Agenda",
        renderCell: (_v, row) => (
          <MeetingCell row={row} meetingItems={meetingItems} agendaItems={agendaItems} />
        ),
      },
    },
    { type: "col", col: { key: "owner",          label: "Owner" } },
    { type: "col", col: { key: "version",         label: "Version", mono: true } },
    {
      type: "col",
      col: {
        key: "last_modified_at",
        label: "Last Modified",
        renderCell: (_v, row) =>
          formatDateShort(String(row.last_modified_at ?? row.created_at ?? "")) as unknown as string,
      },
    },
    { type: "col", col: { key: "workflow_status", label: "Workflow" } },
    { type: "col", col: { key: "approval_status", label: "Status", badge: true } },
  ], [meetingItems, agendaItems]);

  // ── Filter defs ──
  const filterDefs = useMemo<FilterDef[]>(() => [
    { key: "doc_type",                label: "Document Type",           type: "select", options: ["All Types", ...DOCUMENT_TYPES] },
    { key: "file_format",             label: "File Format",             type: "select", options: ["All", ...FILE_FORMATS] },
    { key: "governance_body",         label: "Governance Body",         type: "select", options: ["All Committees", ...govReg.items.map(g => g.body_name)] },
    { key: "related_meeting",         label: "Related Meeting",         type: "select", options: ["All", ...meetingReg.items.map(m => `${m.meeting_id} — ${m.meeting_title}`)] },
    { key: "owner",                   label: "Owner",                   type: "text" },
    { key: "confidentiality",         label: "Confidentiality",         type: "select", options: ["All", ...CONFIDENTIALITY_LEVELS] },
    { key: "workflow_status",         label: "Workflow Status",         type: "select", options: ["All", ...WORKFLOW_STATUSES] },
    { key: "access",                  label: "Access",                  type: "select", options: ["All Accessible", "Owned by Me", "Shared With Me"] },
    { key: "from",                    label: "Created From",            type: "date" },
    { key: "to",                      label: "Created To",              type: "date" },
    { key: "acknowledgement_required",label: "Acknowledgement Required",type: "select", options: ["All", "Yes", "No"] },
    { key: "is_template",             label: "Template State",          type: "select", options: ["All", "Yes", "No"] },
  ], [govReg.items, meetingReg.items]);

  // ── Handlers ──
  const setParam = useCallback((key: string, value: string | null) => {
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      if (value) n.set(key, value); else n.delete(key);
      return n;
    });
  }, [setSearchParams]);

  const handleTabChange = useCallback((id: string) => {
    setSearchParams(p => { const n = new URLSearchParams(p); n.set("tab", id); n.set("page", "1"); return n; });
  }, [setSearchParams]);

  const handleSearchChange = useCallback((v: string) => {
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      if (v) n.set("q", v); else n.delete("q");
      n.set("page", "1");
      return n;
    });
  }, [setSearchParams]);

  const handlePageChange = useCallback((p: number) => {
    setParam("page", String(p));
  }, [setParam]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      FILTER_PARAM_KEYS.forEach(k => {
        const v = filterValues[k];
        if (v) n.set(`f_${k}`, v); else n.delete(`f_${k}`);
      });
      n.set("page", "1");
      return n;
    });
  }, [filterValues, setSearchParams]);

  const handleResetFilters = useCallback(() => {
    setFilterValues({});
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      FILTER_PARAM_KEYS.forEach(k => n.delete(`f_${k}`));
      n.set("page", "1");
      return n;
    });
  }, [setSearchParams]);

  const handleViewRow = useCallback((row: TableRow) => {
    const id = String(row.doc_id ?? row.id ?? "");
    setParam("view", id || null);
  }, [setParam]);

  const handleCloseDrawer = useCallback(() => {
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete("view"); return n; });
  }, [setSearchParams]);

  const handleCardFilter = useCallback((tabId: string) => {
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      const current = n.get("tab") ?? "all";
      n.set("tab", current === tabId ? "all" : tabId);
      n.delete("f_has_unresolved_comments");
      n.set("page", "1");
      return n;
    });
  }, [setSearchParams]);

  const handleCommentsCardFilter = useCallback(() => {
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      const current = n.get("f_has_unresolved_comments");
      if (current === "true") {
        n.delete("f_has_unresolved_comments");
      } else {
        n.set("tab", "all");
        n.set("f_has_unresolved_comments", "true");
      }
      n.set("page", "1");
      return n;
    });
  }, [setSearchParams]);


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="table-page">

      {/* ── Header ── */}
      <div className="table-page__header">
        <div>
          <h1 className="table-page__title">Document Library</h1>
          <p className="table-page__desc">
            Create, organize, review, approve, and collaborate on board documents.
          </p>
        </div>
        <div className="table-page__actions">
          <Button variant="primary" size="lg" leadingIcon={FilePlus} onClick={() => setComposerOpen(true)}>Add Document</Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="doc-lib__cards">
        <StatCard icon={BarChart2}     value={String(totalCount)}          label="Total Documents"     tone="primary"                                onClick={() => handleCardFilter("all")}             selected={tab === "all" && appliedFilters.has_unresolved_comments !== "true"} />
        <StatCard icon={Clock}         value={String(needsAttentionCount)} label="Needs My Attention"  tone="warning"                                onClick={() => handleCardFilter("needs-attention")} selected={tab === "needs-attention"} />
        <StatCard icon={Globe}         value={String(publishedCount)}      label="Published"           tone="success"                                onClick={() => handleCardFilter("published")}       selected={tab === "published"} />
        <StatCard icon={MessageSquare} value={String(commentCount)}        label="Unresolved Comments" tone={commentCount > 0 ? "error" : "neutral"} onClick={handleCommentsCardFilter}                  selected={appliedFilters.has_unresolved_comments === "true"} />
      </div>

      {/* ── Table ── */}
      <UnifiedDataTable
        title="Documents"
        countLabel="documents"
        singularLabel="document"
        totalCount={tabFiltered.length}
        cols={cols}
        rows={pageRows}
        actions={VIEW_ACTION}
        onViewRow={handleViewRow}
        aria-label="Document Library"
        search={q}
        searchPlaceholder="Search documents, owners, meetings, tags…"
        onSearchChange={handleSearchChange}
        filterDefs={filterDefs}
        filterValues={filterValues}
        appliedFilters={appliedFilters}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        tabs={tabDefs}
        activeTab={tab}
        onTabChange={handleTabChange}
        page={page}
        perPage={PER_PAGE}
        onPageChange={handlePageChange}
        mobileCardMapping={{
          primary:    "doc_name",
          identifier: "doc_id",
          meta:       ["doc_type", "related_meeting", "owner"],
          status:     "approval_status",
          date:       "created_at",
        }}
        emptyLabel={TAB_EMPTY[tab] ?? "No documents found."}
        filteredEmptyLabel="No matching documents. Try adjusting your search or filters."
      />

      {/* ── Details Drawer ── */}
      <DocumentDetailsDrawer
        open={drawerDoc !== null}
        onClose={handleCloseDrawer}
        document={drawerDoc}
      />

      {/* ── Composer Modal ── */}
      <DocumentComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />

    </div>
  );
}
