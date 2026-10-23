import { useState, useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Plus, Eye, CheckCircle, XCircle, RefreshCw, Edit2, Send,
  AlertTriangle, Clock, ChevronDown, ChevronUp, Trash2, Archive, FileText,
  CheckCircle2, Circle, Users, MoreVertical,
} from "lucide-react";
import type { PageCfg, KpiDef, TableRow, ColDef, FilterDef } from "../modulePageUtils";
import { fc, BADGE } from "../modulePageUtils";
import {
  useAgendaRegistry,
  useAgendaDocumentLinkRegistry,
  useAuditEventRegistry,
  generateId,
  type AgendaSubmission,
} from "../../data/boardMeetingData";
import { useBmsUserRegistry } from "../../data/bmsUsers";
import { useUserRegistry } from "../../hooks/useUserRegistry";
import { useRoleRegistry } from "../../hooks/useRoleRegistry";
import { AgendaFormModal } from "../../components/agenda/AgendaFormModal";
import { Button } from "../../components/buttons/Button";
import { StatusBadge } from "../../components/badges/StatusBadge";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppSelectField } from "../../components/forms/AppSelectField";
import { AppTextArea } from "../../components/forms/AppTextArea";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { AppModal } from "../../components/modals/AppModal";
import { DynamicDetailsDrawer } from "../../components/drawers/DynamicDetailsDrawer";
import { UnifiedDataTable } from "../../components/tables/UnifiedDataTable";
import { KpiRow } from "../../components/cards/KpiRow";
import { useCurrentUser } from "../../hooks/useCurrentUser";

// ── Duration helpers ──────────────────────────────────────────────────────────

function parseDurationMin(s: string | undefined): number {
  if (!s) return 0;
  const m = /(\d+)\s*(?:min|m)/i.exec(s);
  if (m) return parseInt(m[1], 10);
  const h = /(\d+)\s*h/i.exec(s);
  return h ? parseInt(h[1], 10) * 60 : 0;
}

function formatMinutes(mins: number): string {
  if (mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }); }
  catch { return iso; }
}

// ── Hierarchy helpers ─────────────────────────────────────────────────────────

function getDescendants(id: string, items: AgendaSubmission[]): AgendaSubmission[] {
  const children = items.filter(a => a.parent_agenda_id === id);
  return children.flatMap(c => [c, ...getDescendants(c.id, items)]);
}

function asRec(a: AgendaSubmission): Record<string, string> {
  return a as unknown as Record<string, string>;
}

// ── Approval cascade helpers ──────────────────────────────────────────────────

type ApprovalDialogAction = "submit" | "approve" | "reject" | "request_revision" | "reopen";

function computeCascadeStatus(
  parentId: string,
  allItems: AgendaSubmission[],
  overrides: Map<string, string>,
): string {
  const descendants = getDescendants(parentId, allItems);
  const active = descendants.filter(d => (overrides.get(d.id) ?? d.approval_status) !== "Archived");
  if (active.length === 0) return "Approved";
  const allApproved = active.every(d => (overrides.get(d.id) ?? d.approval_status) === "Approved");
  if (allApproved) return "Approved";
  const anyApproved = active.some(d => (overrides.get(d.id) ?? d.approval_status) === "Approved");
  return anyApproved ? "Partially Approved" : "Pending Approval";
}

function cascadeStatusUp(
  changedId: string,
  changedStatus: string,
  allItems: AgendaSubmission[],
  updateFn: (id: string, newStatus: string, prevStatus: string) => void,
): void {
  const overrides = new Map<string, string>([[changedId, changedStatus]]);
  let itemId = changedId;
  while (true) {
    const item = allItems.find(a => a.id === itemId);
    if (!item?.parent_agenda_id) break;
    const parentId   = item.parent_agenda_id;
    const parent     = allItems.find(a => a.id === parentId);
    if (!parent) break;
    const prevStatus = overrides.get(parentId) ?? parent.approval_status ?? "Draft";
    const newStatus  = computeCascadeStatus(parentId, allItems, overrides);
    if (newStatus !== prevStatus) updateFn(parentId, newStatus, prevStatus);
    overrides.set(parentId, newStatus);
    itemId = parentId;
  }
}

// ── View / tab constants ──────────────────────────────────────────────────────

type View = "all" | "approval" | "temp";

const APPROVAL_QUEUE_STATUSES = new Set([
  "Pending Review", "Pending", "Pending Approval",
  "Ready for Review", "Revision Requested", "Partially Approved", "Rejected", "Reopened",
]);
const SUBMITTABLE_STATUSES    = new Set(["Draft", "Incomplete", "Reopened", "Revision Requested"]);
const TEMP_REVIEW_STATUSES    = new Set([
  "Pending Approval", "Pending Review", "Pending",
  "Revision Requested", "Approved", "Rejected",
]);

// ── Agenda-specific filter definitions ────────────────────────────────────────

const AGENDA_FILTERS: FilterDef[] = [
  {
    key: "approval_status",
    label: "Status",
    type: "select",
    options: ["Draft", "Pending Approval", "Partially Approved", "Approved", "Revision Requested", "Rejected", "Reopened", "Archived"],
  },
  { key: "owner_name",    label: "Owner",          type: "text" },
  { key: "purpose_filter", label: "Purpose",         type: "select",
    options: ["For noting", "For discussion", "For approval", "For information", "For review"] },
  { key: "confidentiality", label: "Confidentiality", type: "select",
    options: ["Public", "Internal", "Confidential", "Restricted"] },
  { key: "has_children",  label: "Has Child Agendas", type: "select", options: ["Yes", "No"] },
];

// ── Shared temp-view config (unchanged) ───────────────────────────────────────

const SHARED_COLS: ColDef[] = [
  fc("agenda_title_display", "Agenda Title"),
  BADGE("level_badge",       "Level"),
  fc("submitted_by",         "Submitted By"),
  fc("priority",             "Priority"),
  fc("submission_date",      "Submission Date"),
  BADGE("approval_status",   "Status"),
];

const SHARED_MOBILE: PageCfg["mobileCardMapping"] = {
  primary:    "agenda_title",
  identifier: "agenda_id",
  meta:       ["submitted_by", "priority"],
  status:     "approval_status",
  date:       "submission_date",
};

const LEVEL_PREFIX: Record<number, string> = { 1: "", 2: "  ↳ ", 3: "    ↳↳ " };

// ── Style constants ───────────────────────────────────────────────────────────

const PANEL_SECTION: CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--color-border)" };

// ── Minimal drawer column schemas ─────────────────────────────────────────────

// Drawer column schemas use the DynamicDetailsDrawer local ColumnDef shape (key+label only)
const PARENT_DRAWER_COLS = [
  { key: "agenda_title",     label: "Title" },
  { key: "agenda_reference", label: "Reference" },
  { key: "confidentiality",  label: "Confidentiality" },
  { key: "approval_status",  label: "Status" },
  { key: "purpose",          label: "Purpose" },
  { key: "agenda_category",  label: "Category" },
  { key: "owner_name",       label: "Owner" },
  { key: "created_at",       label: "Created" },
  { key: "updated_at",       label: "Last Updated" },
];

const CHILD_DRAWER_COLS = [
  { key: "agenda_title",       label: "Title" },
  { key: "parent_title",       label: "Parent Agenda" },
  { key: "approval_status",    label: "Status" },
  { key: "purpose",            label: "Purpose" },
  { key: "presenter_name",     label: "Presenter" },
  { key: "estimated_duration", label: "Duration" },
  { key: "confidentiality",    label: "Confidentiality" },
  { key: "created_at",         label: "Created" },
  { key: "updated_at",         label: "Last Updated" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Register4ListPage() {
  const registry    = useAgendaRegistry();
  const linkReg     = useAgendaDocumentLinkRegistry();
  const auditReg    = useAuditEventRegistry();
  const bmsUserReg  = useBmsUserRegistry();
  const { users: systemUsers } = useUserRegistry();
  const { roles }   = useRoleRegistry();
  const currentUser = useCurrentUser();

  // ── View state ────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<View>("all");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editAgendaId,   setEditAgendaId]   = useState<string | null>(null);
  const [initialChildId, setInitialChildId] = useState<string | null>(null);

  // ── Expandable row state (persisted across drawer open/close) ────────────
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set());

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [drawerParentId, setDrawerParentId] = useState<string | null>(null);
  const [drawerChildId,  setDrawerChildId]  = useState<string | null>(null);

  // ── Search / filter / pagination for All view ────────────────────────────
  const [allSearch,    setAllSearch]    = useState("");
  const [allFilters,   setAllFilters]   = useState<Record<string, string>>({});
  const [allApplied,   setAllApplied]   = useState<Record<string, string>>({});
  const [allPage,      setAllPage]      = useState(1);
  const PER_PAGE = 10;

  // ── Approval queue search / pagination ───────────────────────────────────
  const [approvalSearch, setApprovalSearch] = useState("");
  const [approvalPage,   setApprovalPage]   = useState(1);

  // ── Navigation confirmation ───────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; onConfirm: () => void;
    confirmLabel?: string; danger?: boolean;
  } | null>(null);

  // ── Approval dialog ───────────────────────────────────────────────────────
  const [approvalDialog, setApprovalDialog] = useState<{
    action: ApprovalDialogAction; agendaId: string;
    note: string; reason: string; impact: string;
    errors: Record<string, string>;
  } | null>(null);

  // ── Full preview modal ────────────────────────────────────────────────────
  const [previewParentId, setPreviewParentId] = useState<string | null>(null);

  // ── User helpers ──────────────────────────────────────────────────────────
  const activeUsers = bmsUserReg.items.filter(u =>
    u.account_status !== "inactive" && u.account_status !== "deactivated" && u.account_status !== "archived",
  );

  function resolveUserName(userId: string): string {
    if (!userId) return "";
    return bmsUserReg.items.find(u => u.id === userId)?.name ?? userId;
  }

  // ── Centralized permission check (replaces designation string-matching) ───
  const { myRole, myPermissions } = useMemo(() => {
    const sysUser = systemUsers.find(
      u => u.name === currentUser.name || u.employeeId === currentUser.employeeId,
    );
    const roleName = sysUser?.role ?? "";
    const role = roles.find(r => r.name === roleName);
    return {
      myRole: roleName,
      myPermissions: (role?.permissions ?? []) as string[],
    };
  }, [systemUsers, roles, currentUser.name, currentUser.employeeId]);

  function hasPermission(action: string): boolean {
    const permMap: Record<string, string> = {
      submit:           "agenda_submit",
      approve:          "agenda_approve",
      reject:           "agenda_approve",
      request_revision: "agenda_approve",
      reopen:           "agenda_reopen",
      archive:          "agenda_archive",
      view_history:     "agenda_view_history",
      create:           "agenda_create",
      edit:             "agenda_edit",
    };
    const permId = permMap[action];
    if (permId && myPermissions.includes(permId)) return true;
    // Super Admin / Board Secretary fallback (same as resolveAgendaActions)
    return myRole === "Super Admin" || myRole === "Board Secretary" || myRole === "Admin";
  }

  // ── Doc count helper ──────────────────────────────────────────────────────
  const docCount = (id: string) => linkReg.items.filter(l => l.agenda_id === id).length;

  // ── Actions ───────────────────────────────────────────────────────────────

  function openAdd() {
    setEditAgendaId(null); setInitialChildId(null); setModalOpen(true);
  }
  function openEdit(agendaId: string, childId?: string | null) {
    const item = registry.items.find(a => a.id === agendaId);
    if (!item) return;
    if (item.parent_agenda_id) {
      setEditAgendaId(item.parent_agenda_id); setInitialChildId(agendaId);
    } else {
      setEditAgendaId(agendaId); setInitialChildId(childId ?? null);
    }
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false); setEditAgendaId(null); setInitialChildId(null);
  }

  // ── Drawer helpers ────────────────────────────────────────────────────────

  function openParentDrawer(parentId: string) {
    setDrawerParentId(parentId); setDrawerChildId(null); setDrawerOpen(true);
  }
  function openChildDrawer(childId: string, parentId: string) {
    setDrawerParentId(parentId); setDrawerChildId(childId); setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
  }
  function backToParent() {
    setDrawerChildId(null);
  }

  // ── Toggle expand ─────────────────────────────────────────────────────────

  function toggleExpand(rowId: string) {
    setExpandedParentIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
      return next;
    });
  }

  // Clean up expand IDs when records disappear
  useEffect(() => {
    const existingIds = new Set(registry.items.map(a => a.id));
    setExpandedParentIds(prev => {
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [registry.items]);

  // ── Audit / history ───────────────────────────────────────────────────────

  function pushRichHistory(targetId: string, prevStatus: string, newStatus: string, action: string, note?: string, reason?: string) {
    const target = registry.items.find(a => a.id === targetId);
    if (!target) return;
    const entry = {
      status: newStatus, prev_status: prevStatus, action,
      by: currentUser.name, actor_role: currentUser.designation,
      at: new Date().toISOString(), note: note ?? "", reason: reason ?? "",
    };
    const prev = (target.approval_history ?? []) as object[];
    registry.update(targetId, { approval_history: [...prev, entry] } as never);
  }

  function pushAudit(entityId: string, action: string, details: string) {
    const now = new Date().toISOString();
    const existingIds = auditReg.items.map(e => e.id);
    auditReg.add({
      id: generateId("AUD", existingIds), event_id: generateId("EVT", existingIds),
      entity_type: "Agenda", entity_id: entityId, action,
      actor: currentUser.name, actor_role: currentUser.designation,
      timestamp: now, ip_address: "127.0.0.1", details, approval_status: "",
    } as never);
  }

  // ── Approval dialog ───────────────────────────────────────────────────────

  function openApprovalDialog(agendaId: string, action: ApprovalDialogAction) {
    if (!hasPermission(action) && action !== "submit") {
      toast.error(`You don't have permission to ${action.replace(/_/g, " ")} agendas.`);
      return;
    }
    const item = registry.items.find(a => a.id === agendaId);
    if (!item) return;

    if (action === "submit" && !SUBMITTABLE_STATUSES.has(item.approval_status ?? "")) {
      toast.info(`Cannot submit from "${item.approval_status}" status.`); return;
    }
    if (action === "approve" && item.approval_status === "Approved") {
      toast.info("This agenda is already approved."); return;
    }
    if (action === "approve" && (item.approval_status === "Draft" || item.approval_status === "Archived")) {
      toast.error("Submit the agenda before approving."); return;
    }
    if (action === "reopen" && item.approval_status !== "Approved") {
      toast.info("Only Approved agendas can be reopened."); return;
    }
    if ((action === "reject" || action === "request_revision") && item.approval_status === "Draft") {
      toast.info("Agenda must be submitted first."); return;
    }

    setApprovalDialog({ action, agendaId, note: "", reason: "", impact: "", errors: {} });
  }

  function executeApprovalAction() {
    if (!approvalDialog) return;
    const { action, agendaId, note, reason, impact } = approvalDialog;
    const errs: Record<string, string> = {};
    if (action === "reject"           && !reason.trim()) errs.reason = "Rejection reason is required.";
    if (action === "request_revision" && !note.trim())   errs.note   = "Revision note is required.";
    if (Object.keys(errs).length > 0) { setApprovalDialog(d => d ? { ...d, errors: errs } : null); return; }

    const item = registry.items.find(a => a.id === agendaId);
    if (!item) return;
    const prevStatus = item.approval_status ?? "Draft";

    const newStatus: string = {
      submit: "Pending Approval", approve: "Approved", reject: "Rejected",
      request_revision: "Revision Requested", reopen: "Reopened",
    }[action];

    const snapshot = registry.items.map(a => a.id === agendaId ? { ...a, approval_status: newStatus } : a);
    registry.update(agendaId, { approval_status: newStatus } as never);
    pushRichHistory(agendaId, prevStatus, newStatus, action, note.trim() || undefined,
      (reason.trim() + (impact.trim() ? ` | Impact: ${impact.trim()}` : "")) || undefined);
    pushAudit(agendaId, action, `${action} by ${currentUser.name}: ${note || reason || "(no note)"}`);

    if (action !== "submit") {
      cascadeStatusUp(agendaId, newStatus, snapshot, (pid, cascNew, cascPrev) => {
        registry.update(pid, { approval_status: cascNew } as never);
        pushRichHistory(pid, cascPrev, cascNew, "auto_cascade", undefined, `Auto-updated from descendant ${action}`);
        pushAudit(pid, "auto_cascade", `Status recalculated to ${cascNew} after descendant ${action}`);
      });
    }

    const messages: Record<ApprovalDialogAction, string> = {
      submit: "Submitted for approval.", approve: "Approved successfully.",
      reject: "Rejected.", request_revision: "Revision requested.", reopen: "Agenda reopened.",
    };
    toast.success(messages[action]);
    setApprovalDialog(null);
  }

  function archiveAgenda(id: string) {
    const item = registry.items.find(a => a.id === id);
    if (!item) return;
    const descendants = getDescendants(id, registry.items);
    const doArchive = () => {
      const now = new Date().toISOString();
      registry.update(id, { archived_at: now, archived_by: currentUser.name, approval_status: "Archived" } as never);
      descendants.forEach(d => registry.update(d.id, { archived_at: now, archived_by: currentUser.name, approval_status: "Archived" } as never));
      toast.info(`Archived${descendants.length > 0 ? ` (${descendants.length + 1} items)` : ""}.`);
    };
    setConfirmDialog({
      title: "Archive Agenda",
      message: `This will archive "${item.agenda_title}"${descendants.length > 0 ? ` and ${descendants.length} descendant(s)` : ""}. Approval history is preserved.`,
      confirmLabel: "Archive",
      danger: false,
      onConfirm: () => { doArchive(); setConfirmDialog(null); closeDrawer(); },
    });
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const allItems = registry.items;

  // Parent-only non-temporary items, sorted by display_order
  const parentItems = useMemo(() =>
    allItems
      .filter(a => !a.parent_agenda_id && !(a.is_temporary))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [allItems],
  );

  // Direct children of a parent (L2 only)
  const directChildren = (parentId: string) =>
    allItems
      .filter(a => a.parent_agenda_id === parentId && (a.agenda_level ?? 2) === 2)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  // Unique document count across parent + its direct children
  function uniqueDocCount(parentId: string): number {
    const ids = [parentId, ...allItems.filter(a => a.parent_agenda_id === parentId).map(a => a.id)];
    return new Set(linkReg.items.filter(l => ids.includes(l.agenda_id)).map(l => l.document_id)).size;
  }

  // Build a parent table row
  function buildParentRow(parent: AgendaSubmission): TableRow {
    const children = directChildren(parent.id);
    const totalMin = children.reduce((s, c) => s + parseDurationMin(c.estimated_duration), 0);
    const docs     = uniqueDocCount(parent.id);
    const childSearchText = children.map(c =>
      [c.agenda_title, c.purpose, resolveUserName(asRec(c).presenter_user_id ?? ""), c.approval_status].join(" ")
    ).join(" ");
    return {
      id: parent.id,
      agenda_title:   parent.agenda_title ?? "",
      agenda_reference: parent.agenda_reference ?? "",
      child_count:    children.length,
      child_count_display: `${children.length} child${children.length !== 1 ? " agendas" : " agenda"}`,
      owner_name:     resolveUserName(parent.owner_user_id ?? ""),
      total_duration: formatMinutes(totalMin),
      doc_count:      docs,
      doc_count_display: docs > 0 ? String(docs) : "—",
      approval_status: parent.approval_status ?? "Draft",
      confidentiality: parent.confidentiality ?? "",
      purpose_filter:  parent.purpose ?? "",
      updated_at_display: formatDate(parent.updated_at),
      has_children:   children.length > 0 ? "Yes" : "No",
      // Combined search text (searched client-side)
      _search:        `${parent.agenda_title ?? ""} ${parent.agenda_reference ?? ""} ${resolveUserName(parent.owner_user_id ?? "")} ${childSearchText}`.toLowerCase(),
    };
  }

  const parentRows = useMemo(() =>
    parentItems.map(buildParentRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentItems, linkReg.items, bmsUserReg.items],
  );

  // Approval queue: parents whose status is pending OR that have pending children
  const approvalParentItems = useMemo(() =>
    parentItems.filter(p => {
      if (APPROVAL_QUEUE_STATUSES.has(p.approval_status ?? "")) return true;
      return directChildren(p.id).some(c => APPROVAL_QUEUE_STATUSES.has(c.approval_status ?? ""));
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentItems, allItems],
  );
  const approvalRows = useMemo(() =>
    approvalParentItems.map(buildParentRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvalParentItems, linkReg.items, bmsUserReg.items],
  );

  // Temp-review rows (flat, unchanged behavior)
  const tempRows: TableRow[] = allItems
    .filter(r => r.is_temporary && TEMP_REVIEW_STATUSES.has(r.approval_status ?? ""))
    .map(a => {
      const lv = (a.agenda_level ?? 1) as number;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { approval_history: _ah, ...rest } = a;
      return { ...rest, id: a.id,
        agenda_title_display: (LEVEL_PREFIX[lv] ?? "") + (a.agenda_title ?? ""),
        level_badge: lv === 1 ? "L1" : lv === 2 ? "L2" : "L3" };
    });

  // ── Client-side filter + search for All view ──────────────────────────────

  const filteredParentRows = useMemo(() => {
    let rows = parentRows;
    const q = allSearch.trim().toLowerCase();
    if (q) rows = rows.filter(r => String(r._search ?? "").includes(q) || String(r.agenda_title ?? "").toLowerCase().includes(q));
    if (allApplied.approval_status)  rows = rows.filter(r => r.approval_status === allApplied.approval_status);
    if (allApplied.owner_name)        rows = rows.filter(r => String(r.owner_name ?? "").toLowerCase().includes(allApplied.owner_name.toLowerCase()));
    if (allApplied.purpose_filter)    rows = rows.filter(r => r.purpose_filter === allApplied.purpose_filter);
    if (allApplied.confidentiality)   rows = rows.filter(r => r.confidentiality === allApplied.confidentiality);
    if (allApplied.has_children)      rows = rows.filter(r => r.has_children === allApplied.has_children);
    return rows;
  }, [parentRows, allSearch, allApplied]);

  const paginatedAllRows = useMemo(() => {
    const start = (allPage - 1) * PER_PAGE;
    return filteredParentRows.slice(start, start + PER_PAGE);
  }, [filteredParentRows, allPage]);

  // ── Client-side search for Approval view ─────────────────────────────────

  const filteredApprovalRows = useMemo(() => {
    const q = approvalSearch.trim().toLowerCase();
    if (!q) return approvalRows;
    return approvalRows.filter(r => String(r._search ?? "").includes(q) || String(r.agenda_title ?? "").toLowerCase().includes(q));
  }, [approvalRows, approvalSearch]);

  const paginatedApprovalRows = useMemo(() => {
    const start = (approvalPage - 1) * PER_PAGE;
    return filteredApprovalRows.slice(start, start + PER_PAGE);
  }, [filteredApprovalRows, approvalPage]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalChildCount = allItems.filter(a => a.parent_agenda_id && (a.agenda_level ?? 2) === 2).length;
  const pendingCount    = parentItems.filter(p => APPROVAL_QUEUE_STATUSES.has(p.approval_status ?? "")).length;
  const approvedCount   = parentItems.filter(p => p.approval_status === "Approved").length;

  const kpis: KpiDef[] = [
    { label: "Parent Agendas", value: String(parentItems.length),  tone: "primary" },
    { label: "Child Agendas",  value: String(totalChildCount),     tone: "neutral" },
    { label: "Pending Approval", value: String(pendingCount),      tone: "warning" },
    { label: "Approved",       value: String(approvedCount),       tone: "success" },
  ];

  // ── Parent table columns ──────────────────────────────────────────────────

  const PARENT_COLS: ColDef[] = [
    fc("agenda_title", "Parent Agenda", {
      renderCell: (_val, row) => (
        <div>
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
            {String(row.agenda_title ?? "")}
          </span>
          {row.agenda_reference && (
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: 1 }}>
              {String(row.agenda_reference)}
            </div>
          )}
        </div>
      ),
    }),
    fc("child_count_display", "Child Agendas"),
    fc("owner_name",          "Owner"),
    fc("total_duration",      "Total Duration"),
    fc("doc_count_display",   "Documents"),
    BADGE("approval_status",  "Status"),
    fc("updated_at_display",  "Last Updated"),
  ];

  const TABLE_ACTIONS = [{ id: "view", label: "View", icon: Eye, color: "#6b7280" }];

  // ── Action click handler ──────────────────────────────────────────────────

  function handleTableAction(actionId: string, row: TableRow) {
    if (actionId === "view") {
      openParentDrawer(String(row.id ?? ""));
    }
  }

  // ── Inline child list for expanded row ────────────────────────────────────

  function renderExpandedRow(row: TableRow): ReactNode {
    const parentId = String(row.id ?? "");
    const children = directChildren(parentId);
    const parentIdx = parentItems.findIndex(p => p.id === parentId);

    return (
      <div style={{ background: "var(--color-muted)", borderTop: "1px solid var(--color-border)", padding: "10px 16px 10px 40px" }}>
        {children.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>No child agendas added yet.</span>
            {hasPermission("create") && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); openEdit(parentId, null); }}
                style={{ fontSize: "0.78rem", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
              >
                + Add Child Agenda
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ color: "var(--color-text-secondary)" }}>
                <th style={{ textAlign: "left", padding: "4px 8px 6px 0", fontWeight: 600, width: 44 }}>#</th>
                <th style={{ textAlign: "left", padding: "4px 8px 6px 0", fontWeight: 600 }}>Child Agenda</th>
                <th style={{ textAlign: "left", padding: "4px 8px 6px 0", fontWeight: 600 }}>Purpose</th>
                <th style={{ textAlign: "left", padding: "4px 8px 6px 0", fontWeight: 600 }}>Presenter</th>
                <th style={{ textAlign: "left", padding: "4px 8px 6px 0", fontWeight: 600, width: 80 }}>Duration</th>
                <th style={{ textAlign: "center", padding: "4px 8px 6px 0", fontWeight: 600, width: 60 }}>Docs</th>
                <th style={{ textAlign: "left", padding: "4px 8px 6px 0", fontWeight: 600, width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child, ci) => {
                const presenter = resolveUserName(asRec(child).presenter_user_id ?? "");
                const docs      = docCount(child.id);
                return (
                  <tr
                    key={child.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${child.agenda_title}`}
                    onClick={e => { e.stopPropagation(); openChildDrawer(child.id, parentId); }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault(); e.stopPropagation();
                        openChildDrawer(child.id, parentId);
                      }
                    }}
                    style={{ cursor: "pointer", borderRadius: 4 }}
                    className="expanded-child-row"
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "5px 8px 5px 0", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                      {parentIdx + 1}.{ci + 1}
                    </td>
                    <td style={{ padding: "5px 8px 5px 0", fontWeight: 500, color: "var(--color-text-primary)", maxWidth: 220 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {child.agenda_title}
                      </span>
                    </td>
                    <td style={{ padding: "5px 8px 5px 0", color: "var(--color-text-secondary)" }}>{child.purpose ?? "—"}</td>
                    <td style={{ padding: "5px 8px 5px 0", color: "var(--color-text-secondary)" }}>{presenter || "—"}</td>
                    <td style={{ padding: "5px 8px 5px 0", color: "var(--color-text-secondary)" }}>
                      {child.estimated_duration ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={11} /> {child.estimated_duration}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "5px 8px 5px 0", textAlign: "center", color: "var(--color-text-secondary)" }}>
                      {docs > 0 ? docs : "—"}
                    </td>
                    <td style={{ padding: "5px 0 5px 0" }}>
                      <StatusBadge value={child.approval_status ?? "Draft"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // Mobile expanded content
  function renderExpandedMobileContent(row: TableRow): ReactNode {
    const parentId = String(row.id ?? "");
    const children = directChildren(parentId);
    const parentIdx = parentItems.findIndex(p => p.id === parentId);

    if (children.length === 0) {
      return (
        <div style={{ margin: "0 12px 12px", padding: "10px 12px", background: "var(--color-muted)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>No child agendas added yet.</span>
        </div>
      );
    }

    return (
      <div style={{ margin: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {children.map((child, ci) => {
          const presenter = resolveUserName(asRec(child).presenter_user_id ?? "");
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => openChildDrawer(child.id, parentId)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: 8, padding: "10px 12px", cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  {parentIdx + 1}.{ci + 1}
                </span>
                <StatusBadge value={child.approval_status ?? "Draft"} />
              </div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 4px" }}>{child.agenda_title}</p>
              <div style={{ display: "flex", gap: 10, fontSize: "0.75rem", color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
                {child.purpose && <span>{child.purpose}</span>}
                {presenter && <span>{presenter}</span>}
                {child.estimated_duration && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} /> {child.estimated_duration}</span>}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Drawer content ────────────────────────────────────────────────────────

  const drawerItem = drawerChildId
    ? allItems.find(a => a.id === drawerChildId)
    : drawerParentId
    ? allItems.find(a => a.id === drawerParentId)
    : null;

  const drawerParent = drawerParentId ? allItems.find(a => a.id === drawerParentId) : null;
  const drawerParentIdx = drawerParent ? parentItems.findIndex(p => p.id === drawerParent.id) : -1;

  const drawerRowData: TableRow | null = drawerItem ? (() => {
    const r = asRec(drawerItem);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { approval_history: _ah, ...restItem } = drawerItem;
    return {
      ...restItem,
      id: drawerItem.id,
      agenda_title: drawerItem.agenda_title ?? "",
      agenda_reference: drawerItem.agenda_reference ?? "",
      approval_status: drawerItem.approval_status ?? "Draft",
      confidentiality: drawerItem.confidentiality ?? "",
      purpose: drawerItem.purpose ?? "",
      agenda_category: drawerItem.agenda_category ?? "",
      owner_name: resolveUserName(drawerItem.owner_user_id ?? ""),
      presenter_name: resolveUserName(r.presenter_user_id ?? ""),
      parent_title: drawerParent?.agenda_title ?? "",
      created_at: formatDate(asRec(drawerItem).created_at),
      updated_at: formatDate(drawerItem.updated_at),
    };
  })() : null;

  const drawerTitle = drawerChildId && drawerParent
    ? `${drawerParent.agenda_title} › ${drawerItem?.agenda_title ?? ""}`
    : (drawerItem?.agenda_title ?? "Agenda Details");

  // Build extra body content for the drawer
  const drawerExtraBody: ReactNode = (() => {
    if (!drawerItem) return null;

    if (drawerChildId) {
      // ── Child view extra content ────────────────────────────────────────
      const docLinks = linkReg.items.filter(l => l.agenda_id === drawerChildId);
      const history  = (drawerItem.approval_history ?? []) as unknown as Array<Record<string, string>>;

      return (
        <>
          {/* Discussion Details */}
          {drawerItem.description && (
            <div className="detail-section">
              <h3 className="detail-section__head detail-section__head--static">Discussion Details</h3>
              <div
                className="drawer-rich-html"
                style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", lineHeight: 1.6 }}
                // Safe render: server-stripped HTML. For Tiptap output this is safe-ish; ideally use DOMPurify.
                dangerouslySetInnerHTML={{ __html: drawerItem.description.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") }}
              />
            </div>
          )}

          {/* Linked Documents */}
          <div className="detail-section">
            <h3 className="detail-section__head detail-section__head--static">Documents ({docLinks.length})</h3>
            {docLinks.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>No documents linked to this child agenda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {docLinks.map(link => (
                  <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--color-muted)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                    <FileText size={13} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "0.82rem", color: "var(--color-text-primary)" }}>
                      {String(link.document_id)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval & History */}
          {history.length > 0 && (
            <div className="detail-section">
              <h3 className="detail-section__head detail-section__head--static">Approval History</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...history].reverse().map((entry, i) => (
                  <div key={i} style={{ padding: "8px 10px", background: "var(--color-muted)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <StatusBadge value={entry.status ?? ""} />
                      <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>{formatDate(entry.at)}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                      {entry.action?.replace(/_/g, " ")} · {entry.by ?? ""}
                      {entry.role && ` (${entry.role})`}
                    </div>
                    {(entry.note || entry.reason) && (
                      <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", margin: "4px 0 0", fontStyle: "italic" }}>
                        {entry.note || entry.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    // ── Parent view extra content ──────────────────────────────────────────
    const parentId  = drawerItem.id;
    const children  = directChildren(parentId);
    const totalMin  = children.reduce((s, c) => s + parseDurationMin(c.estimated_duration), 0);
    const docs      = uniqueDocCount(parentId);
    const approved  = children.filter(c => c.approval_status === "Approved").length;
    const pending   = children.filter(c => APPROVAL_QUEUE_STATUSES.has(c.approval_status ?? "")).length;
    const docLinks  = linkReg.items.filter(l => l.agenda_id === parentId);
    const history   = (drawerItem.approval_history ?? []) as unknown as Array<Record<string, string>>;

    return (
      <>
        {/* Agenda Summary */}
        <div className="detail-section">
          <h3 className="detail-section__head detail-section__head--static">Agenda Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            {[
              ["Child Agendas", children.length],
              ["Total Duration", formatMinutes(totalMin)],
              ["Documents", docs],
              ["Approved Children", approved],
              ["Pending Children", pending],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Child Agendas */}
        <div className="detail-section">
          <h3 className="detail-section__head detail-section__head--static">Child Agendas ({children.length})</h3>
          {children.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>No child agendas added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {children.map((child, ci) => {
                const presenter = resolveUserName(asRec(child).presenter_user_id ?? "");
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => openChildDrawer(child.id, parentId)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, width: "100%", textAlign: "left",
                      background: "var(--color-muted)", border: "1px solid var(--color-border)",
                      borderRadius: 8, padding: "8px 10px", cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--color-muted)")}
                  >
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0, paddingTop: 2 }}>
                      {drawerParentIdx >= 0 ? `${drawerParentIdx + 1}.${ci + 1}` : ci + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)" }}>{child.agenda_title}</span>
                        <StatusBadge value={child.approval_status ?? "Draft"} />
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: "0.75rem", color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
                        {child.purpose && <span>{child.purpose}</span>}
                        {presenter && <span>{presenter}</span>}
                        {child.estimated_duration && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} /> {child.estimated_duration}</span>}
                        {docCount(child.id) > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><FileText size={10} /> {docCount(child.id)}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Documents linked to parent */}
        {docLinks.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__head detail-section__head--static">Documents ({docLinks.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {docLinks.map(link => (
                <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--color-muted)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                  <FileText size={13} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: "0.82rem", color: "var(--color-text-primary)" }}>{String(link.document_id)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval History */}
        {history.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__head detail-section__head--static">Approval History</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...history].reverse().map((entry, i) => (
                <div key={i} style={{ padding: "8px 10px", background: "var(--color-muted)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <StatusBadge value={entry.status ?? ""} />
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>{formatDate(entry.at)}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                    {entry.action?.replace(/_/g, " ")} · {entry.by ?? ""}
                  </div>
                  {(entry.note || entry.reason) && (
                    <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", margin: "4px 0 0", fontStyle: "italic" }}>
                      {entry.note || entry.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  })();

  // ── Drawer footer actions ─────────────────────────────────────────────────

  const drawerFooterActions: ReactNode = (() => {
    if (!drawerItem) return null;
    const status   = drawerItem.approval_status ?? "Draft";
    const isOwner  = drawerItem.owner_user_id === bmsUserReg.items.find(u => u.name === currentUser.name)?.id;
    const canEdit  = (isOwner || hasPermission("edit")) && ["Draft", "Revision Requested", "Reopened"].includes(status);
    const canSubmit = SUBMITTABLE_STATUSES.has(status) && (isOwner || hasPermission("submit"));

    if (drawerChildId) {
      return (
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit && (
            <Button variant="primary" size="sm" leadingIcon={Edit2}
              onClick={() => openEdit(drawerChildId, null)}>
              Edit Child Agenda
            </Button>
          )}
          {canSubmit && (
            <Button variant="secondary" size="sm" leadingIcon={Send}
              onClick={() => openApprovalDialog(drawerChildId, "submit")}>
              Submit
            </Button>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", gap: 8 }}>
        {(isOwner || hasPermission("edit")) && (
          <Button variant="primary" size="sm" leadingIcon={Edit2}
            onClick={() => { closeDrawer(); openEdit(drawerItem.id, null); }}>
            Edit Agenda
          </Button>
        )}
        {hasPermission("create") && (
          <Button variant="secondary" size="sm" leadingIcon={Plus}
            onClick={() => { closeDrawer(); openEdit(drawerItem.id, null); }}>
            Add Child
          </Button>
        )}
        <Button variant="secondary" size="sm" leadingIcon={Eye}
          onClick={() => { setPreviewParentId(drawerItem.id); closeDrawer(); }}>
          Preview Full Agenda
        </Button>
      </div>
    );
  })();

  const drawerOverflowActions = (() => {
    if (!drawerItem) return undefined;
    const status   = drawerItem.approval_status ?? "Draft";
    const isOwner  = drawerItem.owner_user_id === bmsUserReg.items.find(u => u.name === currentUser.name)?.id;
    const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];
    const id = drawerChildId ?? drawerItem.id;

    if (SUBMITTABLE_STATUSES.has(status) && (isOwner || hasPermission("submit")))
      items.push({ label: "Submit for Approval", onClick: () => openApprovalDialog(id, "submit") });
    if (APPROVAL_QUEUE_STATUSES.has(status) && hasPermission("approve"))
      items.push({ label: "Approve", onClick: () => openApprovalDialog(id, "approve") });
    if (APPROVAL_QUEUE_STATUSES.has(status) && hasPermission("request_revision"))
      items.push({ label: "Request Revision", onClick: () => openApprovalDialog(id, "request_revision") });
    if (APPROVAL_QUEUE_STATUSES.has(status) && hasPermission("reject"))
      items.push({ label: "Reject", onClick: () => openApprovalDialog(id, "reject"), danger: true });
    if (status === "Approved" && hasPermission("reopen"))
      items.push({ label: "Reopen", onClick: () => openApprovalDialog(id, "reopen") });
    if (!drawerChildId) {
      if (hasPermission("archive"))
        items.push({ label: "Archive", onClick: () => archiveAgenda(drawerItem.id), danger: true });
    }

    return items.length > 0 ? items : undefined;
  })();

  // ── Tab counts ────────────────────────────────────────────────────────────

  const tabs = [
    { id: "all",      label: "All Agendas",      count: parentItems.length },
    { id: "approval", label: "Approval Queue",   count: approvalParentItems.length },
    { id: "temp",     label: "Temporary Review", count: tempRows.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────── */}
      <div style={{ padding: "20px 24px 0" }}>
        <div className="table-page__header">
          <div>
            <h1 className="table-page__title">Agenda Management</h1>
            <p className="table-page__desc">Build, organize, review, and approve agendas and their supporting documents.</p>
          </div>
          {activeView === "all" && (
            <div className="table-page__actions">
              <Button type="button" variant="primary" size="lg" leadingIcon={Plus} onClick={openAdd}>
                Add Agenda
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI row — always visible ───────────────────────────────── */}
      <div style={{ padding: "16px 24px 0" }}>
        <KpiRow kpis={kpis} />
      </div>

      {/* ── All Agendas ────────────────────────────────────────────── */}
      {activeView === "all" && (
        <div style={{ padding: "16px 24px 0" }}>
          <UnifiedDataTable
            title="All Agendas"
            countLabel="parent agendas"
            totalCount={filteredParentRows.length}
            cols={PARENT_COLS}
            rows={paginatedAllRows}
            actions={TABLE_ACTIONS}
            onActionClick={handleTableAction}
            search={allSearch}
            searchPlaceholder="Search agendas…"
            onSearchChange={v => { setAllSearch(v); setAllPage(1); }}
            filterDefs={AGENDA_FILTERS}
            filterValues={allFilters}
            appliedFilters={allApplied}
            onFilterChange={(k, v) => setAllFilters(f => ({ ...f, [k]: v }))}
            onApplyFilters={() => { setAllApplied({ ...allFilters }); setAllPage(1); }}
            onResetFilters={() => { setAllFilters({}); setAllApplied({}); setAllPage(1); }}
            page={allPage}
            perPage={PER_PAGE}
            onPageChange={setAllPage}
            emptyLabel="No parent agendas found."
            filteredEmptyLabel="No agendas match your search or filters."
            mobileCardMapping={{ primary: "agenda_title", identifier: "agenda_reference", meta: ["owner_name", "child_count_display"], status: "approval_status", date: "updated_at_display" }}
            expandedRowIds={expandedParentIds}
            onToggleRow={toggleExpand}
            renderExpandedRow={renderExpandedRow}
            renderExpandedMobileContent={renderExpandedMobileContent}
            tabs={tabs}
            activeTab={activeView}
            onTabChange={(id) => setActiveView(id as View)}
          />
        </div>
      )}

      {/* ── Approval Queue ─────────────────────────────────────────── */}
      {activeView === "approval" && (
        <div style={{ padding: "16px 24px 0" }}>
          <UnifiedDataTable
            title="Approval Queue"
            countLabel="agendas"
            totalCount={filteredApprovalRows.length}
            cols={PARENT_COLS}
            rows={paginatedApprovalRows}
            actions={TABLE_ACTIONS}
            onActionClick={handleTableAction}
            search={approvalSearch}
            searchPlaceholder="Search approval queue…"
            onSearchChange={v => { setApprovalSearch(v); setApprovalPage(1); }}
            page={approvalPage}
            perPage={PER_PAGE}
            onPageChange={setApprovalPage}
            emptyLabel="No agendas requiring approval."
            filteredEmptyLabel="No results match your search."
            mobileCardMapping={{ primary: "agenda_title", meta: ["owner_name", "child_count_display"], status: "approval_status", date: "updated_at_display" }}
            expandedRowIds={expandedParentIds}
            onToggleRow={toggleExpand}
            renderExpandedRow={renderExpandedRow}
            renderExpandedMobileContent={renderExpandedMobileContent}
            tabs={tabs}
            activeTab={activeView}
            onTabChange={(id) => setActiveView(id as View)}
          />
        </div>
      )}

      {/* ── Temporary Review ───────────────────────────────────────── */}
      {activeView === "temp" && (
        <div style={{ padding: "16px 24px 0" }}>
          <UnifiedDataTable
            title="Temporary Review"
            countLabel="agendas"
            totalCount={tempRows.length}
            cols={SHARED_COLS}
            rows={tempRows}
            actions={TABLE_ACTIONS}
            onActionClick={handleTableAction}
            emptyLabel="No temporary review agendas."
            mobileCardMapping={SHARED_MOBILE}
            tabs={tabs}
            activeTab={activeView}
            onTabChange={(id) => setActiveView(id as View)}
          />
        </div>
      )}

      {/* ── Agenda Detail Drawer ────────────────────────────────────── */}
      <DynamicDetailsDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerTitle}
        columns={drawerChildId ? CHILD_DRAWER_COLS : PARENT_DRAWER_COLS}
        rowData={drawerRowData}
        excludeKeys={["id", "_search", "child_count", "doc_count", "has_children", "purpose_filter", "updated_at_display", "parent_agenda_id"]}
        backAction={drawerChildId ? { label: "Back to Parent Agenda", onClick: backToParent } : undefined}
        extraBodyContent={drawerExtraBody}
        extraFooterActions={drawerFooterActions}
        moreFooterActions={drawerOverflowActions}
      />

      {/* ── Agenda Form Modal ───────────────────────────────────────── */}
      <AgendaFormModal
        open={modalOpen}
        agendaId={editAgendaId}
        onClose={closeModal}
        initialChildId={initialChildId}
      />

      {/* ── Confirmation dialog ─────────────────────────────────────── */}
      {confirmDialog && (
        <SConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel ?? "Confirm"}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
          danger={confirmDialog.danger ?? false}
        />
      )}

      {/* ── Full agenda preview modal ───────────────────────────────── */}
      {previewParentId && (() => {
        const pvParent = allItems.find(a => a.id === previewParentId);
        if (!pvParent) return null;
        const pvIdx      = parentItems.findIndex(p => p.id === pvParent.id);
        const pvChildren = directChildren(pvParent.id);
        const pvAllHier  = [pvParent, ...getDescendants(pvParent.id, allItems)];
        const pvApproved = pvAllHier.filter(a => a.approval_status === "Approved").length;
        const pvTotalMin = pvAllHier.reduce((s, a) => s + parseDurationMin(a.estimated_duration), 0);
        const pvTotalDocs = pvAllHier.reduce((s, a) => s + docCount(a.id), 0);

        return (
          <AppModal
            open
            title="Full Agenda Preview"
            subtitle={`${pvIdx + 1}. ${pvParent.agenda_title}`}
            onClose={() => setPreviewParentId(null)}
            size="xl"
          >
            <div style={{ display: "flex", gap: 16, padding: "10px 0 14px", borderBottom: "1px solid var(--color-border)", marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge value={pvParent.approval_status ?? "Draft"} />
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}><strong>{pvAllHier.length}</strong> items</span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}><strong>{pvApproved}/{pvAllHier.length}</strong> approved</span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> <strong>{formatMinutes(pvTotalMin)}</strong>
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <FileText size={12} /> <strong>{pvTotalDocs}</strong> doc{pvTotalDocs !== 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ marginBottom: 14, padding: "12px 14px", background: "var(--color-muted)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0, paddingTop: 2 }}>{pvIdx + 1}.</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{pvParent.agenda_title}</h3>
                    <StatusBadge value={pvParent.approval_status ?? "Draft"} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
                    {pvParent.owner_user_id && <span>Owner: <strong>{resolveUserName(pvParent.owner_user_id)}</strong></span>}
                    {pvParent.estimated_duration && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} /> {pvParent.estimated_duration}</span>}
                    {pvParent.purpose && <span>{pvParent.purpose}</span>}
                    {docCount(pvParent.id) > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><FileText size={11} /> {docCount(pvParent.id)}</span>}
                  </div>
                </div>
              </div>
            </div>

            {pvChildren.map((child, ci) => (
              <div key={child.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0, paddingTop: 2 }}>{pvIdx + 1}.{ci + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>{child.agenda_title}</h4>
                    <StatusBadge value={child.approval_status ?? "Draft"} />
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
                    {child.owner_user_id && <span>Owner: {resolveUserName(child.owner_user_id)}</span>}
                    {child.estimated_duration && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Clock size={10} /> {child.estimated_duration}</span>}
                    {docCount(child.id) > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><FileText size={10} /> {docCount(child.id)}</span>}
                  </div>
                </div>
              </div>
            ))}

            {pvChildren.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13, padding: "16px 0" }}>No child items added yet.</p>
            )}
          </AppModal>
        );
      })()}

      {/* ── Approval dialog ─────────────────────────────────────────── */}
      {approvalDialog && (() => {
        const ad   = approvalDialog;
        const item = allItems.find(a => a.id === ad.agendaId);
        if (!item) return null;
        const titleMap: Record<ApprovalDialogAction, string> = {
          submit: "Submit for Approval", approve: "Approve Agenda",
          reject: "Reject Agenda", request_revision: "Request Revision", reopen: "Reopen Agenda",
        };
        return (
          <AppModal
            open
            title={titleMap[ad.action]}
            subtitle={item.agenda_title}
            onClose={() => setApprovalDialog(null)}
            size="md"
            footer={
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flex: 1 }}>
                <span style={{ fontSize: 11.5, color: "var(--color-text-secondary)", marginRight: "auto" }}>
                  {currentUser.name} · {currentUser.designation}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setApprovalDialog(null)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={executeApprovalAction}>{titleMap[ad.action]}</Button>
              </div>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ad.action === "approve" && (() => {
                const desc = getDescendants(ad.agendaId, allItems).filter(d => d.approval_status !== "Archived");
                const notApproved = desc.filter(d => d.approval_status !== "Approved");
                return notApproved.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#fef9c3", borderRadius: 8 }}>
                    <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#92400e" }}>{notApproved.length} descendant{notApproved.length !== 1 ? "s" : ""} not yet approved — approving now will set "Partially Approved".</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                    <CheckCircle2 size={16} style={{ color: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#15803d" }}>All descendants are approved. Ready to approve.</span>
                  </div>
                );
              })()}

              {ad.action === "reopen" && (
                <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#fef9c3", borderRadius: 8 }}>
                  <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#92400e" }}>Reopening removes the Approved status. Ancestor statuses will be recalculated.</span>
                </div>
              )}

              {(ad.action === "submit" || ad.action === "approve" || ad.action === "reopen") && (
                <AppTextArea
                  id="ad-note"
                  label={ad.action === "reopen" ? "Reason for Reopening (optional)" : "Note (optional)"}
                  value={ad.note}
                  onChange={v => setApprovalDialog(d => d ? { ...d, note: v } : null)}
                  rows={2}
                  placeholder={ad.action === "reopen" ? "Why is this being reopened?" : "Add a note…"}
                />
              )}

              {ad.action === "reject" && (
                <>
                  <AppTextField
                    id="ad-reject-reason"
                    label="Rejection Reason *"
                    value={ad.reason}
                    onChange={v => setApprovalDialog(d => d ? { ...d, reason: v, errors: { ...d.errors, reason: "" } } : null)}
                    placeholder="Provide a clear reason for rejection…"
                  />
                  {ad.errors.reason && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{ad.errors.reason}</p>}
                  <AppTextArea
                    id="ad-reject-impact"
                    label="Impact (optional)"
                    value={ad.impact}
                    onChange={v => setApprovalDialog(d => d ? { ...d, impact: v } : null)}
                    rows={2}
                    placeholder="Describe the impact of this rejection…"
                  />
                </>
              )}

              {ad.action === "request_revision" && (
                <>
                  <AppTextArea
                    id="ad-revision-note"
                    label="Revision Note *"
                    value={ad.note}
                    onChange={v => setApprovalDialog(d => d ? { ...d, note: v, errors: { ...d.errors, note: "" } } : null)}
                    rows={3}
                    placeholder="Describe the required changes in detail…"
                  />
                  {ad.errors.note && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{ad.errors.note}</p>}
                </>
              )}
            </div>
          </AppModal>
        );
      })()}
    </>
  );
}
