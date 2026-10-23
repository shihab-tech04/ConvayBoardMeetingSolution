/**
 * Workflow administration pages:
 *  - WorkflowDefinitionsPage
 *  - ApprovalRulesPage
 *  - ReviewRevisionRulesPage
 *  - WorkflowHistoryPage
 */
import {
  GitBranch, Shield, RefreshCw, History,
  CheckCircle, XCircle, Pencil, Play, Pause, Eye,
  Download, Copy, Archive,
} from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow, KpiDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, gen, CIRCLES_DATA, NAMES } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import {
  WORKFLOW_DRAWER_COLS,
  APPROVAL_RULE_DRAWER_COLS,
  REVISION_RULE_DRAWER_COLS,
  WORKFLOW_HISTORY_DRAWER_COLS,
} from "../boardMeetingDrawerSchemas";

// ─── Local sample data ────────────────────────────────────────────────────────

const WORKFLOW_TYPES = ["Approval", "Review", "Notification", "Escalation", "Archive"];
const WORKFLOW_STATUSES = ["Active", "Inactive", "Draft", "Deprecated"];
const APPROVAL_TYPES = ["Sequential", "Parallel", "Majority Vote", "Any Approver"];
const RULE_TYPES = ["Content Review", "Signature Requirement", "Formatting Check", "Compliance Validation"];

const workflowRows: TableRow[] = gen(28, i => ({
  workflow_id:   `WF-${String(1000 + i).padStart(4, "0")}`,
  workflow_name: [
    "Meeting Notice Approval", "Agenda Submission Workflow", "Minutes Sign-off Process",
    "Document Publication Flow", "Resolution Adoption Workflow", "Board Pack Approval",
    "Attendance Sign-off", "Action Item Escalation", "Quorum Verification Flow",
    "Member Onboarding Workflow",
  ][i % 10],
  workflow_type: WORKFLOW_TYPES[i % 5],
  committee:     CIRCLES_DATA[i % 8],
  steps:         String((i % 5) + 2),
  status:        WORKFLOW_STATUSES[i % 4],
  created_by:    ["Company Secretary", "System Admin", "Governance Officer"][i % 3],
  created_at:    `2025-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  updated_at:    `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  description:   "Manages the structured approval and review process for governance activities.",
  escalation:    ["Board Chairman", "MD", "Company Secretary", "None"][i % 4],
}));

const approvalRuleRows: TableRow[] = gen(24, i => ({
  rule_id:    `AR-${String(2000 + i).padStart(4, "0")}`,
  rule_name:  [
    "Meeting Agenda Approval Rule", "Minutes Approval Policy", "Document Sign-off Rule",
    "Resolution Adoption Rule", "Board Pack Release Rule", "Attendance Verification Rule",
    "Quorum Exception Approval", "Special Session Rule",
  ][i % 8],
  rule_type:  APPROVAL_TYPES[i % 4],
  committee:  CIRCLES_DATA[i % 8],
  approvers:  String((i % 4) + 1),
  threshold:  ["50%+1", "Two-Thirds", "Unanimous", "Any One"][i % 4],
  sla_hours:  String([(24), (48), (72), (168)][i % 4]),
  circle:     ["Board Secretariat", "Governance Unit", "Compliance Office"][i % 3],
  status:     ["Active", "Inactive", "Draft"][i % 3],
  created_by: ["Company Secretary", "System Admin"][i % 2],
  created_at: `2025-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  escalation: ["Board Chairman", "MD", "None"][i % 3],
  description: "Defines the approver chain and threshold for governance document approvals.",
}));

const revisionRuleRows: TableRow[] = gen(20, i => ({
  rule_id:    `RR-${String(3000 + i).padStart(4, "0")}`,
  rule_name:  [
    "Agenda Content Review Rule", "Minutes Revision Policy", "Resolution Amendment Rule",
    "Document Format Check", "Signature Verification Rule", "Date Validation Rule",
    "Compliance Review Rule",
  ][i % 7],
  rule_type:  RULE_TYPES[i % 4],
  applies_to: ["Agenda Items", "Meeting Minutes", "Resolutions", "Board Packs", "All Documents"][i % 5],
  conditions: ["Date mismatch", "Missing signatures", "Format non-compliance", "Content gap"][i % 4],
  approvers:  ["Company Secretary", "Board Chairman", "Legal Counsel"][i % 3],
  status:     ["Active", "Inactive", "Draft"][i % 3],
  created_by: ["Company Secretary", "System Admin"][i % 2],
  created_at: `2025-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  description: ["Triggered when agenda content fails standard validation checks.",
    "Applied when minutes require further review before sign-off."][i % 2],
}));

const workflowHistoryRows: TableRow[] = gen(36, i => ({
  history_id:    `WH-${String(4000 + i).padStart(4, "0")}`,
  workflow_name: workflowRows[i % 28].workflow_name,
  entity_type:   ["Meeting", "Agenda", "Minutes", "Resolution", "Board Pack", "Document"][i % 6],
  entity_title:  NAMES[i % 10],
  action:        ["Initiated", "Approved", "Rejected", "Escalated", "Completed", "Cancelled"][i % 6],
  step_name:     ["Step 1: Secretary Review", "Step 2: Chairman Sign-off", "Step 3: Board Approval"][i % 3],
  actor:         ["Md. Rafiqul Islam", "Mr. Abdul Awal Mintoo", "Ms. Nasrin Sultana", "System"][i % 4],
  action_date:   `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  duration:      `${(i % 24) + 1}h ${(i % 60)}m`,
  committee:     CIRCLES_DATA[i % 8],
  status:        ["Completed", "In Progress", "Pending", "Cancelled"][i % 4],
  workflow_name_key: `WF-${String(1000 + (i % 28)).padStart(4, "0")}`,
  notes:         ["On schedule", "Required escalation", "Completed within SLA", ""][i % 4],
}));

// ─── Pages ────────────────────────────────────────────────────────────────────

export function WorkflowDefinitionsPage() {
  const kpis: KpiDef[] = [
    { label: "Total Workflows",  value: String(workflowRows.length),                                        tone: "primary"  },
    { label: "Active",           value: String(workflowRows.filter(r => r.status === "Active").length),     tone: "success"  },
    { label: "Draft",            value: String(workflowRows.filter(r => r.status === "Draft").length),      tone: "neutral"  },
    { label: "Inactive",         value: String(workflowRows.filter(r => r.status === "Inactive").length),   tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Workflow Definitions",
    desc:  "Configure and manage approval and review workflow definitions used across all governance activities.",
    cols: [
      fc("workflow_id",   "Workflow ID"),
      fc("workflow_name", "Workflow Name"),
      fc("workflow_type", "Type"),
      fc("committee",     "Applies To"),
      fc("steps",         "Steps"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "workflow_name",
      identifier: "workflow_id",
      meta:       ["workflow_type", "committee", "steps"],
      status:     "status",
      date:       "created_at",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Workflow Details",
    drawerCols:   WORKFLOW_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Workflow",    icon: Pencil,      color: "#3b82f6" },
      { id: "activate",   label: "Activate",         icon: Play,        color: "#22c55e" },
      { id: "deactivate", label: "Deactivate",       icon: Pause,       color: "#f59e0b" },
      { id: "duplicate",  label: "Duplicate",        icon: Copy,        color: "#8b5cf6" },
      { id: "view_history", label: "View History",   icon: History,     color: "#6b7280" },
      { id: "archive",    label: "Archive",          icon: Archive,     color: "#ef4444" },
    ],
    rows:      workflowRows,
    kpis,
    entryBtn:  "Create Workflow",
    searchPlaceholder: "Search workflow definitions",
  };

  return <GenPage cfg={cfg} />;
}

export function ApprovalRulesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Rules",  value: String(approvalRuleRows.length),                                           tone: "primary"  },
    { label: "Active",       value: String(approvalRuleRows.filter(r => r.status === "Active").length),        tone: "success"  },
    { label: "Draft",        value: String(approvalRuleRows.filter(r => r.status === "Draft").length),         tone: "neutral"  },
    { label: "Inactive",     value: String(approvalRuleRows.filter(r => r.status === "Inactive").length),      tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Approval Rules",
    desc:  "Define approval chains, quorum thresholds, SLAs, and escalation paths for governance documents and decisions.",
    cols: [
      fc("rule_id",    "Rule ID"),
      fc("rule_name",  "Rule Name"),
      fc("rule_type",  "Approval Type"),
      fc("committee",  "Governance Body"),
      fc("approvers",  "Approvers"),
      fc("threshold",  "Threshold"),
      fc("sla_hours",  "SLA (hrs)"),
      BADGE("status",  "Status"),
    ],
    mobileCardMapping: {
      primary:    "rule_name",
      identifier: "rule_id",
      meta:       ["rule_type", "committee", "threshold"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Approval Rule Details",
    drawerCols:   APPROVAL_RULE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Rule",        icon: Pencil,      color: "#3b82f6" },
      { id: "activate",   label: "Activate",         icon: CheckCircle, color: "#22c55e" },
      { id: "deactivate", label: "Deactivate",       icon: Pause,       color: "#f59e0b" },
      { id: "duplicate",  label: "Duplicate Rule",   icon: Copy,        color: "#8b5cf6" },
      { id: "archive",    label: "Archive",          icon: Archive,     color: "#ef4444" },
    ],
    rows:      approvalRuleRows,
    kpis,
    entryBtn:  "Create Approval Rule",
    searchPlaceholder: "Search approval rules",
  };

  return <GenPage cfg={cfg} />;
}

export function ReviewRevisionRulesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Rules",  value: String(revisionRuleRows.length),                                          tone: "primary"  },
    { label: "Active",       value: String(revisionRuleRows.filter(r => r.status === "Active").length),       tone: "success"  },
    { label: "Draft",        value: String(revisionRuleRows.filter(r => r.status === "Draft").length),        tone: "neutral"  },
    { label: "Inactive",     value: String(revisionRuleRows.filter(r => r.status === "Inactive").length),     tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Review & Revision Rules",
    desc:  "Configure rules that trigger content review, format validation, and revision workflows for governance documents.",
    cols: [
      fc("rule_id",    "Rule ID"),
      fc("rule_name",  "Rule Name"),
      fc("rule_type",  "Rule Type"),
      fc("applies_to", "Applies To"),
      fc("conditions", "Trigger Condition"),
      fc("approvers",  "Reviewer"),
      BADGE("status",  "Status"),
    ],
    mobileCardMapping: {
      primary:    "rule_name",
      identifier: "rule_id",
      meta:       ["rule_type", "applies_to"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Review & Revision Rule Details",
    drawerCols:   REVISION_RULE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Rule",        icon: Pencil,      color: "#3b82f6" },
      { id: "activate",   label: "Activate",         icon: CheckCircle, color: "#22c55e" },
      { id: "deactivate", label: "Deactivate",       icon: Pause,       color: "#f59e0b" },
      { id: "duplicate",  label: "Duplicate",        icon: Copy,        color: "#8b5cf6" },
      { id: "archive",    label: "Archive",          icon: Archive,     color: "#ef4444" },
    ],
    rows:      revisionRuleRows,
    kpis,
    entryBtn:  "Create Revision Rule",
    searchPlaceholder: "Search review rules",
  };

  return <GenPage cfg={cfg} />;
}

export function WorkflowHistoryPage() {
  const kpis: KpiDef[] = [
    { label: "Total Events",   value: String(workflowHistoryRows.length),                                                  tone: "primary"  },
    { label: "Completed",      value: String(workflowHistoryRows.filter(r => r.status === "Completed").length),            tone: "success"  },
    { label: "In Progress",    value: String(workflowHistoryRows.filter(r => r.status === "In Progress").length),          tone: "warning"  },
    { label: "Cancelled",      value: String(workflowHistoryRows.filter(r => r.status === "Cancelled").length),            tone: "error"    },
  ];

  const cfg: PageCfg = {
    title: "Workflow History",
    desc:  "Audit log of all workflow executions, approvals, rejections, and escalations across governance processes.",
    cols: [
      fc("history_id",    "Event ID"),
      fc("workflow_name", "Workflow"),
      fc("entity_type",   "Entity"),
      fc("entity_title",  "Subject"),
      fc("actor",         "Performed By"),
      fc("action_date",   "Date & Time"),
      fc("action",        "Action"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "workflow_name",
      identifier: "history_id",
      meta:       ["entity_type", "actor", "action_date"],
      status:     "status",
      date:       "action_date",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Workflow Event Details",
    drawerCols:   WORKFLOW_HISTORY_DRAWER_COLS,
    drawerActions: [
      { id: "view_workflow", label: "View Workflow",  icon: GitBranch,  color: "#3b82f6" },
      { id: "download",      label: "Export Event",   icon: Download,   color: "#6b7280" },
    ],
    rows:      workflowHistoryRows,
    kpis,
    searchPlaceholder: "Search workflow history",
  };

  return <GenPage cfg={cfg} />;
}
