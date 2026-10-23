import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import {
  RESOLUTION_DRAWER_COLS,
  DECISION_DRAWER_COLS,
  ACTION_DRAWER_COLS,
  ATTENDANCE_DRAWER_COLS,
  CONFLICT_DRAWER_COLS,
} from "../boardMeetingDrawerSchemas";
import {
  useResolutionRegistry,
  useDecisionRegistry,
  useActionItemRegistry,
  useMeetingRegistry,
  useAttendanceRegistry,
  useConflictRegistry,
} from "../../data/boardMeetingData";

// ─── Resolution Register ────────────────────────────────────────────────────

export function ResolutionRegisterPage() {
  const registry = useResolutionRegistry();

  const rows: TableRow[] = registry.items.map(r => ({ ...r, id: r.id }));

  const kpis: KpiDef[] = [
    { label: "Total Resolutions", value: String(rows.length),                                                   tone: "primary" },
    { label: "Adopted",           value: String(rows.filter(r => r.approval_status === "Adopted").length),      tone: "success" },
    { label: "Draft",             value: String(rows.filter(r => r.approval_status === "Draft").length),        tone: "warning" },
    { label: "Rejected",          value: String(rows.filter(r => r.approval_status === "Rejected").length),     tone: "error"   },
  ];

  const cfg: PageCfg = {
    title: "Resolution Register",
    desc:  "Formal register of all resolutions passed by board and committee meetings.",
    cols: [
      fc("resolution_title", "Resolution Title",  { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",   "Source Meeting",    { headerKey: "headers.meetingId" }),
      fc("proposed_by",      "Proposed By",       { headerKey: "headers.submittedBy" }),
      fc("vote_result",      "Vote Result",       { headerKey: "headers.type" }),
      fc("effective_date",   "Effective Date",    { headerKey: "headers.date" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "resolution_title",
      identifier: "resolution_id",
      meta:       ["source_meeting", "proposed_by", "resolution_type"],
      status:     "approval_status",
      date:       "effective_date",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Resolution Details",
    drawerCols: RESOLUTION_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Decision Register ──────────────────────────────────────────────────────

export function DecisionRegisterPage() {
  const registry = useDecisionRegistry();

  const rows: TableRow[] = registry.items.map(d => ({ ...d, id: d.id }));

  const kpis: KpiDef[] = [
    { label: "Total Decisions",  value: String(rows.length),                                                           tone: "primary" },
    { label: "In Progress",      value: String(rows.filter(r => r.implementation_status === "In Progress").length),    tone: "warning" },
    { label: "Completed",        value: String(rows.filter(r => r.implementation_status === "Completed").length),      tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Decision Register",
    desc:  "Formal register of all decisions made by board and committee meetings.",
    cols: [
      fc("decision_title",        "Decision",               { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",        "Meeting",                { headerKey: "headers.meetingId" }),
      fc("decision_owner",        "Owner",                  { headerKey: "headers.submittedBy" }),
      fc("effective_date",        "Effective Date",         { headerKey: "headers.date" }),
      BADGE("implementation_status", "Implementation"),
      BADGE("approval_status",    "Status"),
    ],
    mobileCardMapping: {
      primary:    "decision_title",
      identifier: "decision_id",
      meta:       ["source_meeting", "decision_owner"],
      status:     "implementation_status",
      date:       "effective_date",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Decision Details",
    drawerCols: DECISION_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Action Register ────────────────────────────────────────────────────────

export function ActionRegisterPage() {
  const registry = useActionItemRegistry();
  const today = new Date().toISOString().slice(0, 10);

  const rows: TableRow[] = registry.items.map(a => ({ ...a, id: a.id }));

  const overdue = rows.filter(r => r.due_date && String(r.due_date) < today && r.implementation_status !== "Completed").length;

  const kpis: KpiDef[] = [
    { label: "Total Actions",  value: String(rows.length),                                                         tone: "primary" },
    { label: "Open",           value: String(rows.filter(r => r.implementation_status !== "Completed").length),    tone: "warning" },
    { label: "Completed",      value: String(rows.filter(r => r.implementation_status === "Completed").length),    tone: "success" },
    { label: "Overdue",        value: String(overdue),                                                             tone: "error"   },
  ];

  const cfg: PageCfg = {
    title: "Action Register",
    desc:  "Formal register of all action items arising from board and committee meetings.",
    cols: [
      fc("action_title",         "Action",          { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",       "Source Meeting",  { headerKey: "headers.meetingId" }),
      fc("assigned_to",          "Assignee",        { headerKey: "headers.submittedBy" }),
      fc("due_date",             "Due Date",        { headerKey: "headers.date" }),
      fc("progress",             "Progress",        { headerKey: "headers.totalEntry" }),
      BADGE("implementation_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "action_title",
      identifier: "action_id",
      meta:       ["source_meeting", "assigned_to", "priority"],
      status:     "implementation_status",
      date:       "due_date",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Action Item Details",
    drawerCols: ACTION_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Attendance Register ────────────────────────────────────────────────────

export function AttendanceRegisterPage() {
  const registry = useAttendanceRegistry();

  const rows: TableRow[] = registry.items.map(a => ({ ...a }));

  const kpis: KpiDef[] = [
    { label: "Total Records",     value: String(rows.length),                                                              tone: "primary" },
    { label: "Present",           value: String(rows.filter(r => r.check_in_time).length),                                tone: "success" },
    { label: "Quorum Eligible",   value: String(rows.filter(r => r.quorum_eligible === "Yes").length),                    tone: "neutral" },
    { label: "Signed",            value: String(rows.filter(r => r.signed === "Yes").length),                             tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Attendance Register",
    desc:  "Record of meeting attendance and quorum status for all board and committee meetings.",
    cols: [
      fc("participant_name", "Participant",     { headerKey: "headers.meetingTitle" }),
      fc("meeting_id",       "Meeting",         { headerKey: "headers.meetingId" }),
      fc("attendance_mode",  "Mode",            { headerKey: "headers.totalEntry" }),
      fc("check_in_time",    "Join & Leave",    { headerKey: "headers.date" }),
      fc("quorum_eligible",  "Quorum",          { headerKey: "headers.submittedBy" }),
      BADGE("signed",        "Status"),
    ],
    mobileCardMapping: {
      primary:    "participant_name",
      identifier: "attendance_id",
      meta:       ["meeting_id", "designation", "role"],
      status:     "signed",
      date:       "check_in_time",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Attendance Details",
    drawerCols: ATTENDANCE_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Conflict Register ──────────────────────────────────────────────────────

export function ConflictRegisterPage() {
  const registry = useConflictRegistry();

  const rows: TableRow[] = registry.items.map(c => ({ ...c }));

  const kpis: KpiDef[] = [
    { label: "Declared Conflicts",  value: String(rows.length),                                                         tone: "primary" },
    { label: "Pending Review",      value: String(rows.filter(r => r.review_status === "Under Review").length),         tone: "warning" },
    { label: "Confirmed",           value: String(rows.filter(r => r.review_status === "Confirmed").length),            tone: "error"   },
    { label: "Dismissed",           value: String(rows.filter(r => r.review_status === "Dismissed").length),            tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Conflict of Interest Register",
    desc:  "Register of declared conflicts of interest by board and committee members.",
    cols: [
      fc("declared_by",    "Member",          { headerKey: "headers.meetingTitle" }),
      fc("meeting_id",     "Meeting & Agenda",{ headerKey: "headers.meetingId" }),
      fc("conflict_type",  "Conflict Type",   { headerKey: "headers.type" }),
      fc("action_taken",   "Recusal",         { headerKey: "headers.category" }),
      fc("created_at",     "Declaration Date",{ headerKey: "headers.date" }),
      BADGE("review_status", "Review Status"),
    ],
    mobileCardMapping: {
      primary:    "declared_by",
      identifier: "conflict_id",
      meta:       ["meeting_id", "conflict_type", "action_taken"],
      status:     "review_status",
      date:       "created_at",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Conflict of Interest Details",
    drawerCols: CONFLICT_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}
