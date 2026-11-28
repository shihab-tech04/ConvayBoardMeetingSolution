/**
 * Workflow administration pages:
 *  - WorkflowDefinitionsPage
 *  - ApprovalRulesPage
 *  - ReviewRevisionRulesPage
 *  - WorkflowHistoryPage
 */
import {
  History, CheckCircle, Pencil, Play, Pause, Copy, Archive,
} from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { AuditProjectionPage } from "./AuditProjectionPage";
import { unverifiedWorkflowDefinitionsView } from "./workflowDefinitionsEvidence";
import { unverifiedApprovalRulesView } from "./workflowApprovalRulesEvidence";
import { unverifiedRevisionRulesView } from "./workflowRevisionRulesEvidence";
import {
  WORKFLOW_DRAWER_COLS,
  APPROVAL_RULE_DRAWER_COLS,
  REVISION_RULE_DRAWER_COLS,
} from "../boardMeetingDrawerSchemas";

// AD-01/02/03: authoritative tenant-scoped configuration services are not connected.
// Never display generated policy as real governance data or enable unsupported writes.

// ─── Pages ────────────────────────────────────────────────────────────────────

export function WorkflowDefinitionsPage() {
  const evidence = unverifiedWorkflowDefinitionsView();
  const kpis: KpiDef[] = evidence.kpis;

  const cfg: PageCfg = {
    title: "Workflow Definitions",
    desc:  evidence.description,
    dataError: evidence.unavailableReason,
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
    rows:      evidence.rows,
    kpis,
    entryBtn:  "Create Workflow",
    searchPlaceholder: "Search workflow definitions",
  };

  return <GenPage cfg={cfg} />;
}

export function ApprovalRulesPage() {
  const evidence = unverifiedApprovalRulesView();
  const kpis: KpiDef[] = evidence.kpis;

  const cfg: PageCfg = {
    title: "Approval Rules",
    desc:  evidence.description,
    dataError: evidence.unavailableReason,
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
    rows:      evidence.rows,
    kpis,
    entryBtn:  "Create Approval Rule",
    searchPlaceholder: "Search approval rules",
  };

  return <GenPage cfg={cfg} />;
}

export function ReviewRevisionRulesPage() {
  const evidence = unverifiedRevisionRulesView();
  const kpis: KpiDef[] = evidence.kpis;

  const cfg: PageCfg = {
    title: "Review & Revision Rules",
    desc:  evidence.description,
    dataError: evidence.unavailableReason,
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
    rows:      evidence.rows,
    kpis,
    entryBtn:  "Create Revision Rule",
    searchPlaceholder: "Search review rules",
  };

  return <GenPage cfg={cfg} />;
}

export function WorkflowHistoryPage() {
  return <AuditProjectionPage workflowOnly />;
}
