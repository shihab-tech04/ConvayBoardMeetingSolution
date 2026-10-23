import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { ACTION_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { BarChart2, Calendar, CheckCircle } from "lucide-react";
import { useActionItemRegistry, useMeetingRegistry, useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { patchFormOptions } from "../../utils/patchFormOptions";
import {
  ACTION_ITEM_FORM_FIELDS,
  PROGRESS_UPDATE_FORM_FIELDS,
  EXTENSION_REQUEST_FORM_FIELDS,
  COMPLETION_FORM_FIELDS,
} from "../boardMeetingFormFields";

export function DoubleEntryStatusPage() {
  const registry = useActionItemRegistry();
  const meetingReg = useMeetingRegistry();
  const govReg = useGovernanceRegistry();
  const dynamicFields = patchFormOptions(ACTION_ITEM_FORM_FIELDS, {
    source_meeting: meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
    committee: govReg.items.map(g => g.body_name),
    governance_body: govReg.items.map(g => g.body_name),
  });
  const today = new Date().toISOString().slice(0, 10);

  const rows: TableRow[] = registry.items.map(a => ({ ...a, id: a.id }));

  const overdue   = rows.filter(r => r.due_date && String(r.due_date) < today && r.implementation_status !== "Completed").length;
  const completed = rows.filter(r => r.implementation_status === "Completed").length;
  const inProgress = rows.filter(r => r.implementation_status === "In Progress").length;

  const kpis: KpiDef[] = [
    { label: "Total Actions",  value: String(rows.length),  tone: "primary" },
    { label: "In Progress",    value: String(inProgress),   tone: "warning" },
    { label: "Completed",      value: String(completed),    tone: "success" },
    { label: "Overdue",        value: String(overdue),      tone: "error"   },
  ];

  const cfg: PageCfg = {
    title: "Action Items",
    titleKey: "doubleEntryStatus.title",
    desc: "Track action items arising from board and committee meetings.",
    descKey: "doubleEntryStatus.desc",
    cols: [
      fc("action_title",         "Action",          { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",       "Source Meeting",  { headerKey: "headers.meetingId" }),
      fc("assigned_to",          "Assigned To",     { headerKey: "headers.submittedBy" }),
      fc("due_date",             "Due Date",        { headerKey: "headers.date" }),
      fc("progress",             "Progress",        { headerKey: "headers.totalEntry" }),
      BADGE("implementation_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "action_title",
      identifier: "action_id",
      meta:       ["source_meeting", "assigned_to"],
      status:     "implementation_status",
      date:       "due_date",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Action Item Details",
    drawerCols: ACTION_DRAWER_COLS,
    rows,
    kpis,
    entryBtn:      "Add Action Item",
    formFields:    dynamicFields,
    extraBtns: [
      { id: "progress-update",   label: "Add Progress Update",   icon: BarChart2,   tone: "primary"  as const, formTitle: "Add Progress Update",         formFields: PROGRESS_UPDATE_FORM_FIELDS },
      { id: "extension-request", label: "Request Extension",     icon: Calendar,    tone: "warning"  as const, formTitle: "Request Deadline Extension",  formFields: EXTENSION_REQUEST_FORM_FIELDS },
      { id: "submit-completion", label: "Submit Completion",     icon: CheckCircle, tone: "neutral"  as const, formTitle: "Submit Completion Evidence",  formFields: COMPLETION_FORM_FIELDS },
    ],
    onRowCreate(values) {
      const actId = generateId("ACT", registry.items.map(a => a.action_id));
      registry.add({
        id:                    actId,
        action_id:             actId,
        action_title:          String(values.action_title ?? ""),
        source_meeting:        String(values.source_meeting ?? ""),
        source_decision:       String(values.source_decision ?? ""),
        assigned_to:           String(values.assigned_to ?? ""),
        priority:              String(values.priority ?? "Normal"),
        due_date:              String(values.due_date ?? ""),
        completion_date:       "",
        progress:              "0",
        implementation_status: "Not Started",
        approval_status:       "Open",
        created_at:            new Date().toISOString(),
        activity_history:      [{ action: "Action item created", by: "User", at: new Date().toISOString() }],
      });
    },
  };
  return <GenPage cfg={cfg} />;
}
