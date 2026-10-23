import { useState, useMemo, useEffect, useCallback } from "react";
import type { ComponentType, CSSProperties } from "react";
import { useNavigate } from "react-router";
import {
  CheckSquare, Clock, TrendingDown, CheckCircle2,
  FileCheck, Eye, Users, AlertTriangle, FileText, Zap,
} from "lucide-react";
import { StatCard } from "../../components/cards/StatCard";
import { UnifiedDataTable } from "../../components/tables/UnifiedDataTable";
import { DynamicDetailsDrawer } from "../../components/drawers/DynamicDetailsDrawer";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  useMeetingRegistry,
  useAgendaRegistry,
  useBoardPackRegistry,
  useRSVPRegistry,
  useConflictRegistry,
  useMinutesRegistry,
  useActionItemRegistry,
  useDocumentRegistry,
} from "../../data/boardMeetingData";
import { useDocumentAcknowledgementRegistry } from "../../data/documentWorkspaceData";
import { friendlyDue } from "./dateUtils";
import { fieldMatchesUser, isWorkflowRole } from "./homeWorkspaceUtils";
import type { ColDef, TableRow, FilterDef, MobileCardMapping, TableCellValue } from "../modulePageUtils";
import type { TabDef } from "../../components/tables/UnifiedDataTable";

// ── Types ──────────────────────────────────────────────────────────────────────

type TaskType   = "Approval" | "Review" | "Vote" | "RSVP" | "Declaration" | "Action";
type TaskStatus = "Pending" | "In Progress" | "Overdue" | "Completed";

interface DashTask {
  id: string;
  sourceId: string;
  sourceType: "meeting" | "agenda-item" | "board-pack" | "rsvp" | "declaration" | "minutes" | "action-item" | "document";
  meetingId?: string;
  title: string;
  description: string;
  type: TaskType;
  relatedMeeting: string;
  dueDate: string;
  dueLabel: string;
  status: TaskStatus;
}

// ── Task-type icons & descriptions ─────────────────────────────────────────────

const TASK_ICONS: Record<TaskType, ComponentType<{ size?: number; strokeWidth?: number; style?: CSSProperties }>> = {
  Approval:    FileCheck,
  Review:      Eye,
  Vote:        CheckSquare,
  RSVP:        Users,
  Declaration: AlertTriangle,
  Action:      Zap,
};

const TASK_DESCRIPTIONS: Record<TaskType, string> = {
  Approval:    "Approval required",
  Review:      "Review required",
  Vote:        "Your vote is required",
  RSVP:        "Attendance confirmation needed",
  Declaration: "Declaration required",
  Action:      "Action item assigned",
};

// ── Cell renderers ─────────────────────────────────────────────────────────────

function TaskCell(_: TableCellValue, row: TableRow) {
  const type = String(row.type ?? "") as TaskType;
  const title = String(row.title ?? "");
  const description = String(row._description ?? TASK_DESCRIPTIONS[type] ?? "");
  const Icon = TASK_ICONS[type] ?? FileText;
  return (
    <div className="task-cell">
      <span className="task-cell__icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2} style={{ color: "var(--color-primary)", opacity: 0.75 }} />
      </span>
      <span className="task-cell__body">
        <span className="task-cell__title">{title}</span>
        <span className="task-cell__sub">{description}</span>
      </span>
    </div>
  );
}

function DueCell(_: TableCellValue, row: TableRow) {
  const dueLabel = String(row.dueLabel ?? "");
  const dueDate  = String(row.dueDate  ?? "");
  if (!dueDate || dueLabel === "—") {
    return <span className="card-table__cell-text card-table__cell-text--compact card-table__td--muted">No due date</span>;
  }
  const exactDate = new Date(dueDate + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  const isOverdue = dueLabel.toLowerCase().startsWith("overdue");
  return (
    <span className="due-cell">
      <span className={`due-cell__urgency${isOverdue ? " due-cell__urgency--overdue" : ""}`}>{dueLabel}</span>
      <span className="due-cell__exact">Due: {exactDate}</span>
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOver(due: string, today: string) {
  return due !== "" && due < today;
}

function getDueState(dueDate: string, today: string, weekEnd: string): string {
  if (!dueDate) return "No Due Date";
  if (dueDate < today)   return "Overdue";
  if (dueDate === today)  return "Due Today";
  if (dueDate <= weekEnd) return "Due Soon";
  return "Later";
}

type Tone = "primary" | "success" | "warning" | "error" | "neutral";
function quietWhenZero(val: number, activeTone: Tone): Tone {
  return val === 0 ? "neutral" : activeTone;
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLS: ColDef[] = [
  { type: "col", col: { key: "title",          label: "Task",                   renderCell: TaskCell } },
  { type: "col", col: { key: "relatedMeeting", label: "Related Meeting / Record", truncate: "long" } },
  { type: "col", col: { key: "type",           label: "Type",                    truncate: "compact", badge: true } },
  { type: "col", col: { key: "dueLabel",       label: "Due",                     truncate: "compact", renderCell: DueCell } },
  { type: "col", col: { key: "status",         label: "Status",                  badge: true, truncate: "compact" } },
];

const TASKS_PER_PAGE = 10;

const EMPTY_FILTERS = { type: "", dueState: "", status: "", meeting: "" };

const FILTER_DEFS: FilterDef[] = [
  {
    key: "type", label: "Task Type", type: "select",
    options: ["", "Approval", "Review", "Vote", "RSVP", "Declaration", "Action"],
  },
  {
    key: "dueState", label: "Due State", type: "select",
    options: ["", "Overdue", "Due Today", "Due Soon", "Later", "No Due Date"],
  },
  {
    key: "status", label: "Status", type: "select",
    options: ["", "Pending", "In Progress", "Completed"],
  },
  { key: "meeting", label: "Related Meeting", type: "text" },
];

const MOBILE_MAPPING: MobileCardMapping = {
  primary:    "title",
  identifier: "type",
  meta:       ["relatedMeeting"],
  status:     "status",
  date:       "dueLabel",
};

const DRAWER_COLUMNS = [
  { key: "title",          label: "Task" },
  { key: "type",           label: "Task Type" },
  { key: "status",         label: "Status" },
  { key: "dueLabel",       label: "Due Urgency" },
  { key: "dueDate",        label: "Due Date" },
  { key: "relatedMeeting", label: "Related Meeting / Record" },
  { key: "_description",   label: "Description" },
];

const DRAWER_CTA: Record<string, string> = {
  Approval:    "Open Approval",
  Review:      "Review Document",
  Vote:        "Cast Vote",
  RSVP:        "Confirm Attendance",
  Declaration: "Submit Declaration",
  Action:      "Open Action Item",
};

function docTaskCta(taskId: string): string {
  if (taskId.startsWith("doc-apv-")) return "Open for Approval";
  if (taskId.startsWith("doc-ack-")) return "Open to Acknowledge";
  return "Open Document";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PSRDashboardPage() {
  const navigate    = useNavigate();
  const currentUser = useCurrentUser();

  const [activeTab, setActiveTab]           = useState("all");
  const [search, setSearch]                 = useState("");
  const [page, setPage]                     = useState(1);
  const [filterValues, setFilterValues]     = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [kpiFilter, setKpiFilter]           = useState<string | null>(null);
  const [drawerRow, setDrawerRow]           = useState<TableRow | null>(null);

  const today    = new Date().toISOString().slice(0, 10);
  const weekEnd  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthStr = today.slice(0, 7);

  const { items: meetings }   = useMeetingRegistry();
  const { items: agendas }    = useAgendaRegistry();
  const { items: boardPacks } = useBoardPackRegistry();
  const { items: rsvps }      = useRSVPRegistry();
  const { items: conflicts }  = useConflictRegistry();
  const { items: minutes }    = useMinutesRegistry();
  const { items: actions }    = useActionItemRegistry();
  const { items: documents }  = useDocumentRegistry();
  const { items: acks }       = useDocumentAcknowledgementRegistry();

  const userName    = (currentUser.name ?? "").toLowerCase();
  const userDesig   = currentUser.designation ?? "";
  const hasRoleAccess = isWorkflowRole(userDesig);

  // ── Task assembly — name-based + role-based ownership ──────────────────────

  const tasks = useMemo((): DashTask[] => {
    const out: DashTask[] = [];

    // Meeting approvals — user is chairperson/organizer/secretary by name,
    // OR user has a workflow role (secretariat/secretary/admin) and the meeting is pending
    for (const m of meetings) {
      if (!["Pending Approval", "Awaiting Minutes", "Awaiting Approval"].includes(String(m.approval_status ?? ""))) continue;
      const isInvolved =
        fieldMatchesUser(m.chairperson, userName) ||
        fieldMatchesUser(m.organizer, userName) ||
        fieldMatchesUser(m.secretary, userName);
      if (!isInvolved && !hasRoleAccess) continue;
      const due  = String(m.meeting_date ?? "");
      const over = isOver(due, today);
      out.push({
        id: `mtg-${m.id}`,
        sourceId: String(m.id),
        sourceType: "meeting",
        meetingId: String(m.id),
        title: "Review meeting approval",
        description: "Meeting approval required",
        type: "Approval",
        relatedMeeting: String(m.meeting_title ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: over ? "Overdue" : "Pending",
      });
    }

    // Agenda approvals — user submitted OR has workflow role
    for (const a of agendas) {
      if (!["Pending Approval", "Pending"].includes(String(a.approval_status ?? a.submission_status ?? ""))) continue;
      const isOwner = fieldMatchesUser(a.submitted_by, userName);
      if (!isOwner && !hasRoleAccess) continue;
      const due  = String(a.meeting_date ?? "");
      const over = isOver(due, today);
      out.push({
        id: `agd-${a.id}`,
        sourceId: String(a.id),
        sourceType: "agenda-item",
        meetingId: String(a.meeting_id ?? ""),
        title: "Approve agenda submission",
        description: "Agenda pending approval",
        type: "Approval",
        relatedMeeting: String(a.meeting_title ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: over ? "Overdue" : "Pending",
      });
    }

    // Board pack reviews — user created OR has workflow role
    for (const p of boardPacks) {
      if (["Published", "Archived", "Approved"].includes(String(p.approval_status ?? ""))) continue;
      const isOwner = fieldMatchesUser(p.created_by, userName);
      if (!isOwner && !hasRoleAccess) continue;
      const due  = String(p.meeting_date ?? "");
      const over = isOver(due, today);
      out.push({
        id: `bp-${p.id}`,
        sourceId: String(p.id),
        sourceType: "board-pack",
        meetingId: String(p.related_meeting ?? ""),
        title: "Review board pack",
        description: "Board pack review required",
        type: "Review",
        relatedMeeting: String(p.meeting_title ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: over ? "Overdue" : "Pending",
      });
    }

    // RSVPs — user is the participant; resolve due date from related meeting
    for (const r of rsvps) {
      if (r.response && String(r.response ?? "") !== "Pending") continue;
      if (!fieldMatchesUser(r.participant_name, userName)) continue;
      // Resolve meeting date from the meetings registry via meeting_id
      const relatedMtg = meetings.find(m => String(m.id) === String(r.meeting_id ?? "")
        || m.meeting_title === String(r.meeting_title ?? ""));
      const due  = String(r.meeting_date ?? relatedMtg?.meeting_date ?? "");
      const over = isOver(due, today);
      out.push({
        id: `rsvp-${r.id}`,
        sourceId: String(r.id),
        sourceType: "rsvp",
        meetingId: String(r.meeting_id ?? ""),
        title: "Confirm attendance",
        description: "RSVP confirmation needed",
        type: "RSVP",
        relatedMeeting: String(r.meeting_title ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: over ? "Overdue" : "Pending",
      });
    }

    // Conflict declarations — user declared OR has workflow role (reviews them)
    for (const c of conflicts) {
      const reviewStatus = String(c.review_status ?? "");
      const isOwner = fieldMatchesUser(c.declared_by, userName);
      // Name owners see "Pending"; role users see "Pending" + "Under Review"
      if (isOwner) {
        if (!["Pending", "Under Review"].includes(reviewStatus)) continue;
      } else if (hasRoleAccess) {
        if (!["Pending", "Under Review"].includes(reviewStatus)) continue;
      } else {
        continue;
      }
      const due = String(c.created_at ?? "").slice(0, 10);
      out.push({
        id: `coi-${c.id}`,
        sourceId: String(c.id),
        sourceType: "declaration",
        meetingId: String(c.meeting_id ?? ""),
        title: isOwner ? "Submit conflict declaration" : "Review conflict declaration",
        description: "Conflict of interest requires action",
        type: "Declaration",
        relatedMeeting: String(c.meeting_title ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: "Pending",
      });
    }

    // Minutes reviews — user is minute taker/co-author OR has workflow role
    for (const m of minutes) {
      if (!["Draft", "Awaiting Review"].includes(String(m.approval_status ?? ""))) continue;
      const isOwner =
        fieldMatchesUser(m.minute_taker, userName) ||
        fieldMatchesUser(m.co_authors, userName);
      if (!isOwner && !hasRoleAccess) continue;
      const due  = String(m.meeting_date ?? m.next_meeting_date ?? "");
      const over = isOver(due, today);
      out.push({
        id: `min-${m.id}`,
        sourceId: String(m.id),
        sourceType: "minutes",
        meetingId: String(m.meeting_id ?? ""),
        title: "Review meeting minutes",
        description: "Minutes review required",
        type: "Review",
        relatedMeeting: String(m.meeting_title ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: over ? "Overdue" : "Pending",
      });
    }

    // Action items — assigned to user by name OR assigned to user's role/designation
    for (const a of actions) {
      const assignedTo = String(a.assigned_to ?? "");
      const isDirectlyAssigned = fieldMatchesUser(assignedTo, userName);
      // Role match: if assigned_to contains a workflow-role keyword and user has that role
      const isRoleAssigned = hasRoleAccess && isWorkflowRole(assignedTo);
      if (!isDirectlyAssigned && !isRoleAssigned) continue;

      const status = String(a.implementation_status ?? "");
      if (status === "Completed") {
        const updated = String(a.updated_at ?? a.due_date ?? "").slice(0, 7);
        if (updated === monthStr) {
          const due = String(a.due_date ?? "");
          out.push({
            id: `act-done-${a.id}`,
            sourceId: String(a.id),
            sourceType: "action-item",
            title: String(a.action_title ?? "Action item"),
            description: "Completed action",
            type: "Action",
            relatedMeeting: String(a.source_meeting ?? ""),
            dueDate: due,
            dueLabel: friendlyDue(due),
            status: "Completed",
          });
        }
        continue;
      }
      const due        = String(a.due_date ?? "");
      const over       = isOver(due, today);
      const taskStatus: TaskStatus = over ? "Overdue" : status === "In Progress" ? "In Progress" : "Pending";
      out.push({
        id: `act-${a.id}`,
        sourceId: String(a.id),
        sourceType: "action-item",
        title: String(a.action_title ?? "Action item"),
        description: "Action item assigned to you",
        type: "Action",
        relatedMeeting: String(a.source_meeting ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: taskStatus,
      });
    }

    // ── Document review — doc is "Under Review"; user is owner or has workflow role
    for (const d of documents) {
      if (d.is_template) continue;
      if (d.approval_status !== "Under Review") continue;
      const isOwner = fieldMatchesUser(d.owner, userName);
      if (!isOwner && !hasRoleAccess) continue;
      const due  = String(d.effective_date ?? d.created_at ?? "").slice(0, 10);
      out.push({
        id: `doc-rev-${d.id}`,
        sourceId: String(d.doc_id ?? d.id),
        sourceType: "document",
        title: `Review: ${d.doc_name}`,
        description: "Document review required",
        type: "Review",
        relatedMeeting: String(d.related_meeting ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: isOver(due, today) ? "Overdue" : "Pending",
      });
    }

    // ── Document approval — doc is "Pending Approval"; user is owner or has workflow role
    for (const d of documents) {
      if (d.is_template) continue;
      if (d.approval_status !== "Pending Approval") continue;
      const isOwner = fieldMatchesUser(d.owner, userName);
      if (!isOwner && !hasRoleAccess) continue;
      const due  = String(d.effective_date ?? d.created_at ?? "").slice(0, 10);
      out.push({
        id: `doc-apv-${d.id}`,
        sourceId: String(d.doc_id ?? d.id),
        sourceType: "document",
        title: `Approve: ${d.doc_name}`,
        description: "Document approval required",
        type: "Approval",
        relatedMeeting: String(d.related_meeting ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: isOver(due, today) ? "Overdue" : "Pending",
      });
    }

    // ── Document acknowledgement — doc requires ack; user has not yet acknowledged
    for (const d of documents) {
      if (d.is_template) continue;
      if (d.acknowledgement_required !== "Yes") continue;
      if (!["Approved", "Published"].includes(String(d.approval_status ?? ""))) continue;
      const docId = String(d.doc_id ?? d.id);
      const alreadyAcked = acks.some(
        a => a.document_id === docId && a.acknowledged_by.toLowerCase() === userName,
      );
      if (alreadyAcked) continue;
      const due = String(d.effective_date ?? d.created_at ?? "").slice(0, 10);
      out.push({
        id: `doc-ack-${d.id}`,
        sourceId: docId,
        sourceType: "document",
        title: `Acknowledge: ${d.doc_name}`,
        description: "Explicit acknowledgement required for this document",
        type: "Review",
        relatedMeeting: String(d.related_meeting ?? ""),
        dueDate: due,
        dueLabel: friendlyDue(due),
        status: isOver(due, today) ? "Overdue" : "Pending",
      });
    }

    const seen = new Set<string>();
    const deduped = out.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });

    return deduped.sort((a, b) => {
      const rank = (t: DashTask) => {
        if (t.status === "Overdue") return 0;
        if (t.dueDate === today)    return 1;
        if (t.dueDate <= weekEnd && t.dueDate > today) return 2;
        if (t.dueDate)              return 3;
        if (t.status === "Completed") return 5;
        return 4;
      };
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (a.dueDate || "zzz").localeCompare(b.dueDate || "zzz");
    });
  }, [meetings, agendas, boardPacks, rsvps, conflicts, minutes, actions, documents, acks, today, weekEnd, monthStr, userName, hasRoleAccess]);

  // ── KPI counts ───────────────────────────────────────────────────────────────

  const openCount      = tasks.filter(t => t.status !== "Completed").length;
  const dueSoonCount   = tasks.filter(t => t.dueDate > today && t.dueDate <= weekEnd && t.status !== "Completed").length;
  const overdueCount   = tasks.filter(t => t.status === "Overdue").length;
  const completedMonth = tasks.filter(t => t.status === "Completed").length;

  // ── Tab counts ───────────────────────────────────────────────────────────────

  const tabCounts = useMemo(() => ({
    all:          tasks.length,
    approvals:    tasks.filter(t => t.type === "Approval").length,
    reviews:      tasks.filter(t => t.type === "Review").length,
    votes:        tasks.filter(t => t.type === "Vote").length,
    actions:      tasks.filter(t => t.type === "Action").length,
    declarations: tasks.filter(t => t.type === "Declaration" || t.type === "RSVP").length,
    completed:    tasks.filter(t => t.status === "Completed").length,
  }), [tasks]);

  const TASK_TABS: TabDef[] = [
    { id: "all",          label: "All",               count: tabCounts.all },
    { id: "approvals",    label: "Approvals",          count: tabCounts.approvals },
    { id: "reviews",      label: "Reviews",            count: tabCounts.reviews },
    { id: "votes",        label: "Votes & Signatures", count: tabCounts.votes },
    { id: "actions",      label: "Actions",            count: tabCounts.actions },
    { id: "declarations", label: "Declarations",       count: tabCounts.declarations },
    { id: "completed",    label: "Completed",          count: tabCounts.completed },
  ];

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = tasks;

    if (kpiFilter === "open")               { list = tasks.filter(t => t.status !== "Completed"); }
    else if (kpiFilter === "due-soon")      { list = tasks.filter(t => t.dueDate > today && t.dueDate <= weekEnd && t.status !== "Completed"); }
    else if (kpiFilter === "overdue")       { list = tasks.filter(t => t.status === "Overdue"); }
    else if (kpiFilter === "completed-month") { list = tasks.filter(t => t.status === "Completed"); }
    else {
      if (activeTab === "approvals")         list = list.filter(t => t.type === "Approval");
      else if (activeTab === "reviews")      list = list.filter(t => t.type === "Review");
      else if (activeTab === "votes")        list = list.filter(t => t.type === "Vote");
      else if (activeTab === "actions")      list = list.filter(t => t.type === "Action");
      else if (activeTab === "declarations") list = list.filter(t => t.type === "Declaration" || t.type === "RSVP");
      else if (activeTab === "completed")    list = list.filter(t => t.status === "Completed");
    }

    if (appliedFilters.type)    list = list.filter(t => t.type === appliedFilters.type);
    if (appliedFilters.status)  list = list.filter(t => t.status === appliedFilters.status);
    if (appliedFilters.meeting) {
      const q = appliedFilters.meeting.toLowerCase();
      list = list.filter(t => t.relatedMeeting.toLowerCase().includes(q));
    }
    if (appliedFilters.dueState) {
      list = list.filter(t => getDueState(t.dueDate, today, weekEnd) === appliedFilters.dueState);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.relatedMeeting.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
      );
    }

    return list;
  }, [tasks, activeTab, search, appliedFilters, kpiFilter, today, weekEnd]);

  useEffect(() => { setPage(1); }, [activeTab, search, appliedFilters, kpiFilter]);

  const paginatedRows: TableRow[] = useMemo(() =>
    filtered
      .slice((page - 1) * TASKS_PER_PAGE, page * TASKS_PER_PAGE)
      .map(t => ({
        id:             t.id,
        _task:          t,
        _description:   t.description,
        title:          t.title,
        relatedMeeting: t.relatedMeeting || "—",
        type:           t.type,
        dueDate:        t.dueDate,
        dueLabel:       t.dueLabel || "—",
        status:         t.status,
      })),
    [filtered, page]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleKpiClick = (filter: string) => {
    setKpiFilter(prev => prev === filter ? null : filter);
    setActiveTab("all");
    setSearch("");
  };

  const handleViewRow = useCallback((row: TableRow) => {
    setDrawerRow(row);
  }, []);

  const navigateToTask = (task: DashTask) => {
    switch (task.sourceType) {
      case "meeting": {
        const mtg = meetings.find(m => String(m.id) === task.sourceId);
        const status = String(mtg?.approval_status ?? mtg?.status ?? "");
        if (["In Progress", "Paused", "On Break"].includes(status)) {
          navigate(`/meetings/${task.sourceId}/live`);
          return;
        }
        navigate("/meetings/all-meetings");
        break;
      }
      case "agenda-item":  navigate("/agenda-documents/agenda-management"); break;
      case "board-pack":   navigate("/agenda-documents/board-packs"); break;
      case "rsvp":         navigate("/meetings/all-meetings"); break;
      case "declaration":  navigate("/meetings/all-meetings"); break;
      case "minutes":      navigate("/archive-reports/minutes"); break;
      case "action-item":  navigate("/decisions-followup/action-items"); break;
      case "document":     navigate(`/agenda-documents/document-library?view=${task.sourceId}`); break;
      default:             navigate("/home/my-tasks");
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="dashboard-page home-workspace-page">

      {/* Page header */}
      <div className="dashboard-page__header">
        <div className="dashboard-page__header-body">
          <h1 className="dashboard-page__title">My Tasks</h1>
          <p className="dashboard-page__subtitle">
            Review approvals, documents, votes, declarations, and assigned follow-up actions.
          </p>
        </div>
      </div>

      {/* Summary KPI cards — compact density */}
      <div className="mytasks-summary">
        <StatCard
          density="compact"
          icon={CheckSquare}
          value={String(openCount)}
          label="Open"
          tone={quietWhenZero(openCount, "primary")}
          selected={kpiFilter === "open"}
          onClick={() => handleKpiClick("open")}
        />
        <StatCard
          density="compact"
          icon={Clock}
          value={String(dueSoonCount)}
          label="Due Soon"
          tone={quietWhenZero(dueSoonCount, "warning")}
          selected={kpiFilter === "due-soon"}
          onClick={() => handleKpiClick("due-soon")}
        />
        <StatCard
          density="compact"
          icon={TrendingDown}
          value={String(overdueCount)}
          label="Overdue"
          tone={quietWhenZero(overdueCount, "error")}
          selected={kpiFilter === "overdue"}
          onClick={() => handleKpiClick("overdue")}
        />
        <StatCard
          density="compact"
          icon={CheckCircle2}
          value={String(completedMonth)}
          label="Completed This Month"
          tone={quietWhenZero(completedMonth, "success")}
          selected={kpiFilter === "completed-month"}
          onClick={() => handleKpiClick("completed-month")}
        />
      </div>

      {/* Task queue — UnifiedDataTable */}
      <UnifiedDataTable
        title="Task Queue"
        countLabel="tasks"
        singularLabel="task"
        totalCount={filtered.length}
        cols={COLS}
        rows={paginatedRows}
        actions={[{ id: "view", label: "View", icon: Eye }]}
        onViewRow={handleViewRow}
        aria-label="My Tasks"
        search={search}
        searchPlaceholder="Search tasks"
        onSearchChange={v => { setSearch(v); setPage(1); }}
        filterDefs={FILTER_DEFS}
        filterValues={filterValues}
        appliedFilters={appliedFilters}
        onFilterChange={(k, v) => setFilterValues(prev => ({ ...prev, [k]: v }))}
        onApplyFilters={() => { setAppliedFilters({ ...filterValues }); }}
        onResetFilters={() => { setFilterValues(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); }}
        tabs={TASK_TABS}
        activeTab={activeTab}
        onTabChange={t => { setActiveTab(t); setKpiFilter(null); setPage(1); }}
        onPrint={handlePrint}
        page={page}
        perPage={TASKS_PER_PAGE}
        onPageChange={setPage}
        emptyLabel="You have no pending tasks."
        filteredEmptyLabel="No matching tasks. Try changing your search or filters."
        mobileCardMapping={MOBILE_MAPPING}
      />

      {/* Task Details drawer — row click opens this; footer CTA navigates to the task */}
      <DynamicDetailsDrawer
        open={drawerRow !== null}
        onClose={() => setDrawerRow(null)}
        title="Task Details"
        columns={DRAWER_COLUMNS}
        rowData={drawerRow}
        showActions
        extraFooterActions={(() => {
          const task = drawerRow?._task as DashTask | undefined;
          if (!task) return null;
          const label = task.sourceType === "document"
            ? docTaskCta(task.id)
            : (DRAWER_CTA[task.type] ?? "Open Task");
          return (
            <PrimaryButton
              type="button"
              onClick={() => { setDrawerRow(null); navigateToTask(task); }}
            >
              {label}
            </PrimaryButton>
          );
        })()}
      />

    </div>
  );
}
