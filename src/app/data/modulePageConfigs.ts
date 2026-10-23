import { Eye, Download, Printer, CheckCircle, XCircle, Pencil, Send, RotateCcw, UserCheck, Play, RefreshCw, Ban, Users, UserPlus, AlertTriangle, Calendar, Clock, BarChart2, ListChecks, FileText, Package, Upload, UploadCloud, Scale, FileCheck2, ClipboardList, BookOpen } from "lucide-react";
import type { ColDef, FlatCol, RowAction, FilterDef, TableRow } from "../pages/modulePageUtils";
import { fc, BADGE, ZONES, CIRCLES, AY_OPTS, CIRCLES_DATA, NAMES } from "../pages/modulePageUtils";

// ─── Constants ────────────────────────────────────────────────────────────────
export const ST_OPTS = ["All Status", "Pending", "Approved", "Rejected"];
export const MTG_IDS = [
  "MTG-2026-001", "MTG-2026-002", "MTG-2026-003", "MTG-2026-004", "MTG-2026-005",
  "MTG-2026-006", "MTG-2026-007", "MTG-2026-008", "MTG-2026-009", "MTG-2026-010",
];

// ─── Mock Data Generators ─────────────────────────────────────────────────────
export function gen(n: number, extra: (i: number) => TableRow = () => ({})): TableRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `REF-${1000 + i}`,
    meeting_id: MTG_IDS[i % 10],
    meeting_title: NAMES[i % 10],
    committee: CIRCLES_DATA[i % 8],
    meeting_year: "2026",
    status: ["Pending", "Approved", "Rejected"][i % 3],
    date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
    ...extra(i),
  }));
}

export function mkReportRow(i: number, extra: TableRow = {}): TableRow {
  return {
    committee: CIRCLES_DATA[i % 8],
    t_pending: String(5 + i),
    t_approved: String(20 + i * 2),
    t_rejected: String(2 + (i % 3)),
    t_total: String(27 + i * 3),
    t_revenue: String(10 + i * 5),
    u_pending: String(50 + i * 3),
    u_approved: String(200 + i * 10),
    u_rejected: String(15 + i * 2),
    u_total: String(265 + i * 13),
    u_revenue: String(100 + i * 20),
    ...extra,
  };
}

// ─── Action Sets ──────────────────────────────────────────────────────────────
export const ROW_VIEW: RowAction[] = [{ id: "view", label: "View Details", labelKey: "actions.viewDetails", icon: Eye }];

/** Single shared View action for table rows. Table rows must contain only this action; workflow actions belong in the detail drawer. */
export const TABLE_VIEW_ACTION: RowAction = { id: "view", label: "View", icon: Eye };

export const MEETING_ACTIONS: RowAction[] = [
  { id: "view",  label: "View Details",  labelKey: "actions.viewDetails",   icon: Eye },
  { id: "start", label: "Start Meeting", labelKey: "actions.startMeeting",  icon: Play, color: "#22c55e" },
];

export const MEETING_DRAWER_ACTIONS: RowAction[] = [
  { id: "edit",    label: "Edit",            labelKey: "Edit",                  icon: Pencil },
  { id: "start",   label: "Start Meeting",   labelKey: "actions.startMeeting",  icon: Play,         color: "#22c55e" },
  { id: "approve", label: "Approve",         labelKey: "Approve",               icon: CheckCircle,  color: "#22c55e" },
  { id: "reject",  label: "Reject",          labelKey: "Reject",                icon: XCircle,      color: "#ef4444" },
];

export const STD: RowAction[] = [
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
  { id: "print", label: "Print Record", labelKey: "Print", icon: Printer },
  { id: "approve", label: "Approve Record", labelKey: "Approve", icon: CheckCircle, color: "#22c55e" },
  { id: "reject", label: "Reject Record", labelKey: "Reject", icon: XCircle, color: "#ef4444" },
];

export const VIEW: RowAction[] = [
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
  { id: "print", label: "Print Record", labelKey: "Print", icon: Printer },
];

export const EDIT: RowAction[] = [
  { id: "edit", label: "Edit", labelKey: "Edit", icon: Pencil },
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
  { id: "approve", label: "Approve Record", labelKey: "Approve", icon: CheckCircle, color: "#22c55e" },
  { id: "reject", label: "Reject Record", labelKey: "Reject", icon: XCircle, color: "#ef4444" },
];

export const VERIFY: RowAction[] = [
  { id: "verify", label: "Verify Record", labelKey: "actions.verifyRecord", icon: CheckCircle },
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
  { id: "print", label: "Print Record", labelKey: "Print", icon: Printer },
];

export const RESOLVE_TRANSFER: RowAction[] = [
  { id: "resolve", label: "Resolve", labelKey: "actions.resolve", icon: CheckCircle },
  { id: "transfer", label: "Transfer", labelKey: "actions.transfer", icon: Send },
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
];

export const RESOLVE: RowAction[] = [
  { id: "resolve", label: "Resolve", labelKey: "actions.resolve", icon: RotateCcw },
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
];

export const TRANSFER: RowAction[] = [
  { id: "transfer", label: "Transfer", labelKey: "actions.transfer", icon: Send },
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
];

export const ASSIGN: RowAction[] = [
  { id: "download", label: "Download Record", labelKey: "Download", icon: Download },
  { id: "print", label: "Print Record", labelKey: "Print", icon: Printer },
  { id: "assign", label: "Assign Officer", labelKey: "Assign Officer", icon: UserCheck },
];

export const MEETING_FULL_ACTIONS: RowAction[] = [
  { id: "edit",             label: "Edit",              labelKey: "Edit",                    icon: Pencil },
  { id: "approve",          label: "Approve",           labelKey: "Approve",                 icon: CheckCircle,   color: "#22c55e" },
  { id: "reject",           label: "Reject",            labelKey: "Reject",                  icon: XCircle,       color: "#ef4444" },
  { id: "request_revision", label: "Request Revision",  labelKey: "actions.requestRevision", icon: RefreshCw,     color: "#f59e0b" },
  { id: "cancel",           label: "Cancel/Postpone",   labelKey: "actions.cancelRecord",    icon: Ban,           color: "#ef4444" },
  // ── Participants ──────────────────────────────────────────────────────────
  { id: "manage_participants",      label: "Manage Participants",     icon: Users,          color: "#3b82f6" },
  { id: "send_invitations",         label: "Send Invitations",        icon: Send,           color: "#8b5cf6" },
  { id: "manage_rsvp",              label: "Manage RSVP",             icon: UserCheck,      color: "#22c55e" },
  { id: "add_external_invitee",     label: "Add External Invitee",   icon: UserPlus,       color: "#6b7280" },
  { id: "assign_alternate",         label: "Assign Alternate",        icon: RefreshCw,      color: "#f59e0b" },
  { id: "add_conflict_declaration", label: "Add Conflict Declaration",icon: AlertTriangle,  color: "#ef4444" },
  // ── Schedule ─────────────────────────────────────────────────────────────
  { id: "create_availability_poll", label: "Create Availability Poll",icon: Calendar,       color: "#3b82f6" },
  { id: "reschedule_meeting",       label: "Reschedule Meeting",      icon: Clock,          color: "#f59e0b" },
  // ── Readiness ────────────────────────────────────────────────────────────
  { id: "review_quorum",            label: "Review Quorum",           icon: BarChart2,      color: "#6366f1" },
  { id: "resolve_readiness",        label: "Resolve Readiness Issues",icon: ListChecks,     color: "#22c55e" },
  // ── Documents ────────────────────────────────────────────────────────────
  { id: "add_document",             label: "Add Document",            icon: FileText,       color: "#3b82f6" },
  { id: "create_board_pack",        label: "Create Board Pack",       icon: Package,        color: "#8b5cf6" },
  { id: "publish_board_pack",       label: "Publish Board Pack",      icon: Upload,         color: "#22c55e" },
  { id: "upload_new_version",       label: "Upload New Version",      icon: UploadCloud,    color: "#3b82f6" },
  // ── Outcomes ─────────────────────────────────────────────────────────────
  { id: "view_decisions",           label: "View Decisions",          icon: Scale,          color: "#6366f1" },
  { id: "view_resolutions",         label: "View Resolutions",        icon: FileCheck2,     color: "#8b5cf6" },
  { id: "view_actions",             label: "View Actions",            icon: ClipboardList,  color: "#f59e0b" },
  { id: "prepare_minutes",          label: "Prepare Minutes",         icon: BookOpen,       color: "#22c55e" },
];

export const DOCUMENT_ACTIONS: RowAction[] = [
  { id: "edit",             label: "Edit",              labelKey: "Edit",                          icon: Pencil },
  { id: "approve",          label: "Approve",           labelKey: "Approve",                       icon: CheckCircle,  color: "#22c55e" },
  { id: "reject",           label: "Reject",            labelKey: "Reject",                        icon: XCircle,      color: "#ef4444" },
  { id: "publish",          label: "Publish",           labelKey: "actions.publish",               icon: Play,         color: "#22c55e" },
  { id: "archive",          label: "Archive",           labelKey: "actions.archive",               icon: Download,     color: "#6b7280" },
  { id: "request_revision", label: "Request Revision",  labelKey: "actions.requestRevision",       icon: RefreshCw,    color: "#f59e0b" },
];

// ─── Filter Definitions ───────────────────────────────────────────────────────
export const REPORT_FILTERS: FilterDef[] = [
  { key: "meeting_year", label: "Meeting Year", labelKey: "labels.meetingYear", type: "select", options: AY_OPTS },
  { key: "meeting_type", label: "Meeting Type", labelKey: "labels.meetingType", type: "select", options: ZONES },
  { key: "committee",    label: "Committee",    labelKey: "labels.committee",   type: "select", options: CIRCLES },
  { key: "from",         label: "From Date",    labelKey: "labels.fromDate",    type: "date" },
  { key: "to",           label: "To Date",      labelKey: "labels.toDate",      type: "date" },
];

export const REPORT_FILTERS_STATUS: FilterDef[] = [
  ...REPORT_FILTERS,
  { key: "status", label: "Status", labelKey: "labels.status", type: "select", options: ST_OPTS },
];

// ─── Column Helpers ───────────────────────────────────────────────────────────
const fg = (label: string, cols: FlatCol[], groupKey?: string): ColDef => ({ type: "group", group: { label, groupKey, cols } });

const agendaEntryGroup = (label: string): ColDef => {
  const isToday = label === "Entry Today";
  const p = isToday ? "t" : "u";
  return fg(label, [
    { key: `${p}_pending`,  label: "Pending",           headerKey: "headers.pending" },
    { key: `${p}_approved`, label: "Approved",          headerKey: "headers.approved" },
    { key: `${p}_rejected`, label: "Rejected",          headerKey: "headers.rejected" },
    { key: `${p}_total`,    label: "Total Entry",       headerKey: "headers.totalEntry" },
    { key: `${p}_revenue`,  label: "Total Resolutions", headerKey: "headers.totalRelatedRevenue" },
  ], isToday ? "groups.entryToday" : "groups.entryUpto");
};

const actionGroup = (label: string): ColDef => {
  const isToday = label === "Entry Today";
  const p = isToday ? "t" : "u";
  return fg(label, [
    { key: `${p}_pending`,  label: "Pending",     headerKey: "headers.pending" },
    { key: `${p}_approved`, label: "Completed",   headerKey: "headers.approved" },
    { key: `${p}_rejected`, label: "Overdue",     headerKey: "headers.rejected" },
    { key: `${p}_total`,    label: "Total Entry", headerKey: "headers.totalEntry" },
  ], isToday ? "groups.entryToday" : "groups.entryUpto");
};

// ─── Mock Report Data ─────────────────────────────────────────────────────────
const ACTION_ROWS = CIRCLES_DATA.map((_, i) => mkReportRow(i));

// ─── Report Configurations ────────────────────────────────────────────────────
export interface ReportCfg {
  title: string;
  desc: string;
  cols: ColDef[];
  filters: FilterDef[];
  rows: TableRow[];
  drawerCols?: ColDef[];
}

export const REPORT_CFGS: Record<string, ReportCfg> = {
  "offline-return-report": {
    title: "Meeting Summary Report",
    desc: "Review meeting entries by committee, meeting type, resolutions, and submission status.",
    filters: REPORT_FILTERS,
    cols: [
      fc("committee", "Committee", { headerKey: "headers.committee" }),
      fg("Agenda Entry Today", [
        { key: "t_82bb",    label: "Regular",             headerKey: "headers.return82bb" },
        { key: "t_82c2",    label: "Special",             headerKey: "headers.return82c2" },
        { key: "t_212",     label: "Emergency",           headerKey: "headers.return212" },
        { key: "t_normal",  label: "Annual",              headerKey: "headers.returnNormal" },
        { key: "t_total",   label: "Total Entry",         headerKey: "headers.totalEntry" },
        { key: "t_tds",     label: "Recorded Decisions",  headerKey: "headers.taxPaidWithReturnTds" },
        { key: "t_tax_paid",label: "Total Actions",       headerKey: "headers.totalTaxPaid" },
      ], "groups.returnEntryToday"),
      fg("Agenda Entry Upto", [
        { key: "u_82bb",    label: "Regular",             headerKey: "headers.return82bb" },
        { key: "u_82c2",    label: "Special",             headerKey: "headers.return82c2" },
        { key: "u_212",     label: "Emergency",           headerKey: "headers.return212" },
        { key: "u_normal",  label: "Annual",              headerKey: "headers.returnNormal" },
        { key: "u_total",   label: "Total Entry",         headerKey: "headers.totalEntry" },
        { key: "u_tds",     label: "Recorded Decisions",  headerKey: "headers.taxPaidWithReturnTds" },
        { key: "u_tax_paid",label: "Total Actions",       headerKey: "headers.totalTaxPaid" },
      ], "groups.returnEntryUpto"),
    ],
    rows: CIRCLES_DATA.map((_, i) => ({
      committee:  CIRCLES_DATA[i],
      t_82bb:     String(10 + i),
      t_82c2:     String(8 + i),
      t_212:      String(5 + i),
      t_normal:   String(30 + i * 2),
      t_total:    String(53 + i * 4),
      t_tds:      String((5 + i) * 3),
      t_tax_paid: String((8 + i) * 2),
      u_82bb:     String(100 + i * 5),
      u_82c2:     String(80 + i * 4),
      u_212:      String(50 + i * 3),
      u_normal:   String(300 + i * 20),
      u_total:    String(530 + i * 32),
      u_tds:      String((50 + i * 5) * 3),
      u_tax_paid: String((80 + i * 8) * 2),
    })),
  },
  "tax-category-report": {
    title: "Meeting Type Report",
    desc: "Track meeting submissions by committee type, meeting category, and channel.",
    filters: REPORT_FILTERS,
    cols: [
      fc("category", "Meeting Type", { headerKey: "headers.category" }),
      fg("Meetings", [
        { key: "online",  label: "Scheduled", headerKey: "headers.online" },
        { key: "offline", label: "Completed", headerKey: "headers.offline" },
        { key: "total",   label: "Total",     headerKey: "headers.total" },
      ], "groups.submissions"),
    ],
    rows: [
      { category: "Board of Directors",                   online: "12", offline: "10", total: "22" },
      { category: "Executive Committee",                  online: "24", offline: "22", total: "46" },
      { category: "Audit Committee",                      online: "8",  offline: "7",  total: "15" },
      { category: "Risk Management Committee",            online: "6",  offline: "5",  total: "11" },
      { category: "Shariah Supervisory Committee",        online: "4",  offline: "4",  total: "8"  },
      { category: "Nomination & Remuneration Committee",  online: "4",  offline: "3",  total: "7"  },
      { category: "HR Committee",                         online: "6",  offline: "6",  total: "12" },
      { category: "IT Steering Committee",                online: "4",  offline: "3",  total: "7"  },
    ],
  },
  "express-cert-disposal": {
    title: "Document Approval Report",
    desc: "Review board paper requests, approval status, and pending document items.",
    filters: REPORT_FILTERS,
    cols: [
      fc("committee", "Committee", { headerKey: "headers.committee" }),
      fg("Today", [
        { key: "t_pending",   label: "Pending",        headerKey: "headers.pending" },
        { key: "t_approved",  label: "Approved",       headerKey: "headers.approved" },
        { key: "t_rejected",  label: "Rejected",       headerKey: "headers.rejected" },
        { key: "t_total_req", label: "Total Request",  headerKey: "headers.totalRequest" },
        { key: "t_disposed",  label: "Total Approved", headerKey: "headers.totalDisposed" },
      ], "groups.today"),
      fg("Upto", [
        { key: "u_pending",   label: "Pending",        headerKey: "headers.pending" },
        { key: "u_approved",  label: "Approved",       headerKey: "headers.approved" },
        { key: "u_rejected",  label: "Rejected",       headerKey: "headers.rejected" },
        { key: "u_total_req", label: "Total Request",  headerKey: "headers.totalRequest" },
        { key: "u_disposed",  label: "Total Approved", headerKey: "headers.totalDisposed" },
      ], "groups.upto"),
    ],
    rows: CIRCLES_DATA.map((c, i) => ({
      committee:   c,
      t_pending:   String(3 + i),
      t_approved:  String(12 + i * 2),
      t_rejected:  String(1 + (i % 2)),
      t_total_req: String(16 + i * 3),
      t_disposed:  String(13 + i * 2),
      u_pending:   String(30 + i * 3),
      u_approved:  String(120 + i * 10),
      u_rejected:  String(10 + i),
      u_total_req: String(160 + i * 14),
      u_disposed:  String(130 + i * 11),
    })),
  },
  "user-activity-report": {
    title: "User Activity Report",
    desc: "Monitor user actions, login activity, and system usage records.",
    filters: [
      { key: "meeting_type", label: "Meeting Type",  labelKey: "labels.meetingType", type: "select", options: ZONES,   optionKeys: { "All Types": "options.allTypes" } },
      { key: "committee",    label: "Committee",     labelKey: "labels.committee",   type: "select", options: CIRCLES, optionKeys: { "All Committees": "options.allCommittees" } },
      { key: "status",       label: "Active Status", type: "select", options: ["All Status", "Active", "Inactive"] },
      { key: "from",         label: "From Date",     labelKey: "labels.fromDate",    type: "date" },
      { key: "to",           label: "To Date",       labelKey: "labels.toDate",      type: "date" },
    ],
    cols: [
      fc("committee",      "Committee",      { headerKey: "headers.committee",     mobileCard: false }),
      fc("user_id",        "User ID",        { headerKey: "headers.userId",        mobileCard: true }),
      fc("user_name",      "User Name",      { headerKey: "headers.userName",      mobileCard: true }),
      fc("designation",    "Designation",    { headerKey: "headers.designation",   mobileCard: true }),
      fc("last_login",     "Last Login",     { headerKey: "headers.lastLogin",     mobileCard: true }),
      { type: "col", col: { key: "active_status", label: "Active Status", badge: true, headerKey: "headers.activeStatus", mobileCard: true } },
      fc("entry_today",    "Entry Today",    { headerKey: "headers.entryToday" }),
    ],
    drawerCols: [
      { type: "group", group: { label: "User Identity", groupKey: "groups.userIdentity", cols: [
        { key: "committee",   label: "Committee",  headerKey: "headers.committee" },
        { key: "user_id",     label: "User ID",    headerKey: "headers.userId" },
        { key: "designation", label: "Designation",headerKey: "headers.designation" },
        { key: "user_name",   label: "User Name",  headerKey: "headers.userName" },
        { key: "email",       label: "Email",      headerKey: "headers.email" },
        { key: "phone",       label: "Phone",      headerKey: "headers.phone" },
      ]}},
      { type: "group", group: { label: "Login Details", groupKey: "groups.loginDetails", cols: [
        { key: "last_login",            label: "Last Login",            headerKey: "headers.lastLogin" },
        { key: "login_location",        label: "Login Location",        headerKey: "headers.loginLocation" },
        { key: "login_ip",              label: "Login IP",              headerKey: "headers.loginIp" },
        { key: "device_browser",        label: "Device / Browser",      headerKey: "headers.deviceBrowser" },
        { key: "login_status",          label: "Login Status",          headerKey: "headers.loginStatus" },
        { key: "session_duration",      label: "Session Duration",      headerKey: "headers.sessionDuration" },
        { key: "failed_login_attempts", label: "Failed Login Attempts", headerKey: "headers.failedLoginAttempts" },
      ]}},
      { type: "group", group: { label: "System Activity", groupKey: "groups.systemActivity", cols: [
        { key: "last_activity_time",  label: "Last Activity Time",  headerKey: "headers.lastActivityTime" },
        { key: "total_actions_today", label: "Total Actions Today", headerKey: "headers.totalActionsToday" },
        { key: "entry_today",         label: "Entry Today",         headerKey: "headers.entryToday" },
        { key: "entry_upto",          label: "Entry Up to",         headerKey: "headers.entryUpto" },
        { key: "records_created",     label: "Records Created",     headerKey: "headers.recordsCreated" },
        { key: "records_updated",     label: "Records Updated",     headerKey: "headers.recordsUpdated" },
        { key: "records_approved",    label: "Records Approved",    headerKey: "headers.recordsApproved" },
        { key: "records_rejected",    label: "Records Rejected",    headerKey: "headers.recordsRejected" },
      ]}},
      { type: "group", group: { label: "Output Activity", groupKey: "groups.outputActivity", cols: [
        { key: "reports_downloaded", label: "Reports Downloaded", headerKey: "headers.reportsDownloaded" },
        { key: "prints_taken",       label: "Prints Taken",       headerKey: "headers.printsTaken" },
      ]}},
      { type: "group", group: { label: "Security Activity", groupKey: "groups.securityActivity", cols: [
        { key: "last_pass_change",      label: "Last Password Change",  headerKey: "headers.lastPassChange" },
        { key: "password_change_count", label: "Password Change Count", headerKey: "headers.passwordChangeCount" },
      ]}},
      { type: "group", group: { label: "Latest Action", groupKey: "groups.latestAction", cols: [
        { key: "last_action",      label: "Last Action",      headerKey: "headers.lastAction" },
        { key: "activity_summary", label: "Activity Summary", headerKey: "headers.activitySummary" },
      ]}},
    ],
    rows: (() => {
      const USER_NAMES = [
        "Md. Rafiqul Islam", "Nasrin Akhter", "A.K.M. Hossain", "Fatema Begum", "Md. Kamal Uddin",
        "Shahnaz Parvin", "Md. Jahangir Alam", "Rubina Khanam", "Md. Anisur Rahman", "Taslima Begum",
        "Md. Shafiqul Islam", "Hosne Ara", "Md. Aminul Haque", "Laila Arjumand", "Md. Rezaul Karim",
        "Morsheda Khatun",
      ];
      const DESIGS = ["Company Secretary", "Joint Secretary", "Meeting Secretary", "Agenda Coordinator", "Document Manager"];
      const LOCATIONS = ["Head Office", "Board Room A", "Remote – VPN", "Conference Room B", "Home – VPN"];
      const IPS = ["192.168.1.101", "192.168.1.102", "10.0.0.55", "192.168.2.10", "172.16.0.34"];
      const DEVICES = [
        "Chrome 124 / Windows 11", "Firefox 125 / Windows 10",
        "Edge 123 / Windows 11",   "Chrome / Android 14",
        "Safari / iOS 17",
      ];
      const LOGIN_STATUSES = ["Active", "Active", "Active", "Idle", "Logged Out", "Session Expired", "Active"];
      const LAST_ACTIONS = [
        "Approved minutes for MTG-2024-001",
        "Rejected agenda item – missing attachment",
        "Viewed resolution status report",
        "Updated meeting record (MTG-2024-005)",
        "Downloaded action item report",
        "Approved board paper submission",
        "Generated meeting summary report",
        "Verified attendance submission",
      ];
      const SUMMARIES = [
        "27 actions today; 15 minutes approved, 5 rejected, 7 reports viewed.",
        "12 actions; attended 3 committee meetings, downloaded 2 reports.",
        "Idle since 11:30 AM; 8 records updated earlier.",
        "No activity recorded for today's session.",
        "43 actions; bulk approval of 30 agenda items, 3 reports generated.",
        "Session expired after inactivity; 6 entries made before logout.",
        "19 actions; mixed approvals and rejections with 4 prints taken.",
        "Active session; 5 resolutions verified, 2 action items reviewed.",
      ];
      return Array.from({ length: 16 }, (_, i) => {
        const loginH = 8 + (i % 4);
        const loginM = (i * 7) % 60;
        const actH   = loginH + 1 + (i % 3);
        const actM   = (loginM + 25) % 60;
        const durMin = 15 + i * 11;
        const durH   = Math.floor(durMin / 60);
        const durR   = durMin % 60;
        return {
          committee:             CIRCLES_DATA[i % 8],
          user_id:               `USR-${1000 + i}`,
          designation:           DESIGS[i % 5],
          user_name:             USER_NAMES[i],
          email:                 `${USER_NAMES[i].toLowerCase().replace(/[^a-z]/g, "").slice(0, 8)}${i + 1}@nccbank.com.bd`,
          phone:                 `017${String(10000000 + i * 1111111).slice(0, 8)}`,
          last_login:            `2026-06-${String(14 - (i % 7)).padStart(2, "0")} ${String(loginH).padStart(2, "0")}:${String(loginM).padStart(2, "0")}`,
          last_pass_change:      `2026-0${(i % 5) + 1}-01`,
          active_status:         i % 7 === 6 ? "Inactive" : "Active",
          entry_today:           String(5 + i * 2),
          entry_upto:            String(200 + i * 30),
          login_location:        LOCATIONS[i % 5],
          login_ip:              IPS[i % 5],
          device_browser:        DEVICES[i % 5],
          login_status:          LOGIN_STATUSES[i % 7],
          session_duration:      LOGIN_STATUSES[i % 7] === "Logged Out" ? "—" : `${durH}h ${String(durR).padStart(2, "0")}m`,
          last_activity_time:    `2026-06-${String(14 - (i % 7)).padStart(2, "0")} ${String(actH).padStart(2, "0")}:${String(actM).padStart(2, "0")}`,
          total_actions_today:   String(3 + i * 3),
          records_created:       String(1 + (i % 5)),
          records_updated:       String(i % 4),
          records_approved:      String(2 + (i % 8)),
          records_rejected:      String(i % 3),
          reports_downloaded:    String(i % 4),
          prints_taken:          String(i % 6),
          password_change_count: String(1 + (i % 5)),
          failed_login_attempts: String(i % 4),
          last_action:           LAST_ACTIONS[i % 8],
          activity_summary:      SUMMARIES[i % 8],
        };
      });
    })(),
  },
  "litigation-arrear": {
    title: "Action Item Report",
    desc: "Review action item entries, completion status, approvals, and follow-up resolutions.",
    filters: REPORT_FILTERS_STATUS,
    cols: [fc("circle", "Committee"), agendaEntryGroup("Entry Today"), agendaEntryGroup("Entry Upto")],
    rows: ACTION_ROWS,
  },
  "litigation-writ-case": {
    title: "Resolution Status Report",
    desc: "Track resolution records by committee, category, status, and implementation progress.",
    filters: REPORT_FILTERS_STATUS,
    cols: [fc("circle", "Committee"), agendaEntryGroup("Entry Today"), agendaEntryGroup("Entry Upto")],
    rows: ACTION_ROWS,
  },
  "litigation-dept-case": {
    title: "Committee Decision Report",
    desc: "Review committee decision records and approval status by committee.",
    filters: REPORT_FILTERS_STATUS,
    cols: [fc("circle", "Committee"), agendaEntryGroup("Entry Today"), agendaEntryGroup("Entry Upto")],
    rows: ACTION_ROWS,
  },
  "litigation-taxpayer-case": {
    title: "Member Request Report",
    desc: "Track member requests, hearings, status, and related resolutions.",
    filters: REPORT_FILTERS_STATUS,
    cols: [fc("circle", "Committee"), actionGroup("Entry Today"), actionGroup("Entry Upto")],
    rows: ACTION_ROWS,
  },
  "appeal-report": {
    title: "Minutes Revision Report",
    desc: "Review minutes revision requests by member, grounds, submission date, and status.",
    filters: REPORT_FILTERS_STATUS,
    cols: [fc("circle", "Committee"), actionGroup("Entry Today"), actionGroup("Entry Upto")],
    rows: ACTION_ROWS,
  },
  "tribunal-report": {
    title: "Escalation Report",
    desc: "Track escalated matters by committee, category, date, and resolution status.",
    filters: REPORT_FILTERS_STATUS,
    cols: [fc("circle", "Committee"), actionGroup("Entry Today"), actionGroup("Entry Upto")],
    rows: ACTION_ROWS,
  },
  "payment-demand-report": {
    title: "Agenda Financial Report",
    desc: "Review financial agenda items, member ledgers, approved amounts, and outstanding items.",
    filters: REPORT_FILTERS_STATUS,
    cols: [
      fc("committee",     "Committee",    { headerKey: "headers.committee" }),
      fc("meeting_id",    "Meeting ID",   { headerKey: "headers.meetingId" }),
      fc("meeting_title", "Meeting Title",{ headerKey: "headers.meetingTitle" }),
      fc("meeting_year",  "Meeting Year", { headerKey: "headers.meetingYear" }),
      fg("Agenda", [
        { key: "original_demand", label: "Original (BDT)",    headerKey: "headers.originalDemand" },
        { key: "penalty",         label: "Variance (BDT)",    headerKey: "headers.penalty" },
        { key: "total_demand",    label: "Total (BDT)",       headerKey: "headers.totalDemand" },
      ], "groups.demand"),
      fg("Resolution", [
        { key: "payment_amount", label: "Approved (BDT)",    headerKey: "headers.paidAmountBdt" },
        { key: "outstanding",    label: "Outstanding (BDT)", headerKey: "headers.outstandingBdt" },
      ], "groups.payment"),
      BADGE("payment_status", "Status"),
    ],
    rows: gen(20, i => ({
      original_demand: `৳${(i * 100 + 200) * 1000}`,
      penalty:         `৳${(i * 10 + 20) * 1000}`,
      total_demand:    `৳${(i * 110 + 220) * 1000}`,
      payment_amount:  `৳${(i * 80 + 100) * 1000}`,
      outstanding:     `৳${(i * 30 + 120) * 1000}`,
      payment_status:  ["Approved", "Pending", "Under Review"][i % 3],
    })),
  },
  "register-5-report": {
    title: "Resolution Register Report",
    desc: "Track resolution register records, approval status, and related entries.",
    filters: REPORT_FILTERS_STATUS,
    cols: [
      fc("committee",     "Committee",       { headerKey: "headers.committee" }),
      fc("meeting_title", "Meeting",         { headerKey: "headers.meetingTitle" }),
      fc("case_no",       "Resolution No.",  { headerKey: "headers.caseNo" }),
      fc("case_type",     "Resolution Type", { headerKey: "headers.caseType" }),
      fc("amount",        "Financial Impact",{ headerKey: "headers.amount" }),
      fc("assessment_date","Resolution Date",{ headerKey: "headers.assessmentDate" }),
      BADGE("case_status", "Status"),
    ],
    rows: gen(20, i => ({
      case_no:         `RES-${3000 + i}`,
      case_type:       ["Governance", "Financial", "Compliance"][i % 3],
      amount:          `৳${(i * 50 + 100) * 1000}`,
      assessment_date: `2026-0${(i % 9) + 1}-01`,
      case_status:     ["Pending", "Approved", "Rejected"][i % 3],
    })),
  },
};

// ─── Drawer Field Definitions ─────────────────────────────────────────────────
export const REPORT_DRAWER_FIELDS: Record<string, { label: string; key: string }[]> = {
  "user-activity-report": [
    { label: "User ID",               key: "user_id" },
    { label: "User Name",             key: "user_name" },
    { label: "Committee",             key: "circle" },
    { label: "Designation",           key: "designation" },
    { label: "Email",                 key: "email" },
    { label: "Phone",                 key: "phone" },
    { label: "Last Login",            key: "last_login" },
    { label: "Last Password Change",  key: "last_pass_change" },
    { label: "Active Status",         key: "active_status" },
    { label: "Entry Today",           key: "entry_today" },
    { label: "Entry Upto",            key: "entry_upto" },
  ],
};
