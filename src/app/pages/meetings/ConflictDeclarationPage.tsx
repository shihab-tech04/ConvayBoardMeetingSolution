import { toast } from "sonner";
import { AlertTriangle, Eye } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { CONFLICT_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useConflictRegistry, useMeetingRegistry, generateId } from "../../data/boardMeetingData";
import { CONFLICT_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function ConflictDeclarationPage() {
  const { items: conflicts, add: addConflict, update: updateConflict } = useConflictRegistry();
  const meetingReg = useMeetingRegistry();
  const meetingOptions = meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title);
  const dynamicConflictFields = patchFormOptions(CONFLICT_FORM_FIELDS, {
    meeting_id: meetingOptions,
  });

  const rows: TableRow[] = conflicts.map(c => ({
    ...c,
    id:              c.id,
    agenda_item:     c.agenda_item || "—",
    action_taken:    c.action_taken || "—",
    reviewed_by:     c.reviewed_by || "—",
    approval_status: c.review_status,
  }));

  const kpis: KpiDef[] = [
    { label: "Total Declarations",   value: String(conflicts.length),                                                          tone: "primary" },
    { label: "Pending Review",        value: String(conflicts.filter(c => c.review_status === "Pending").length),               tone: "warning" },
    { label: "Reviewed",              value: String(conflicts.filter(c => c.review_status === "Reviewed").length),              tone: "success" },
    { label: "Financial Conflicts",   value: String(conflicts.filter(c => c.conflict_type === "Financial Interest").length),    tone: "error"   },
    { label: "Relationship Conflicts",value: String(conflicts.filter(c => c.conflict_type === "Personal Relationship").length), tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Conflict of Interest Declarations",
    desc:  "Record and manage conflict of interest declarations by meeting participants.",
    cols: [
      fc("meeting_title", "Meeting",       { headerKey: "headers.meetingTitle" }),
      fc("declared_by",   "Declared By",   { headerKey: "headers.submittedBy" }),
      fc("conflict_type", "Conflict Type", { headerKey: "headers.type" }),
      fc("action_taken",  "Action Taken",  { headerKey: "headers.amount" }),
      BADGE("approval_status", "Review Status"),
    ],
    mobileCardMapping: {
      primary:    "declared_by",
      identifier: "conflict_id",
      meta:       ["meeting_title", "conflict_type"],
      status:     "approval_status",
      date:       "created_at",
    },
    filters:       BASE_FILTERS,
    actions:       ROW_VIEW,
    drawerTitle: "Declaration Details",
    drawerCols: CONFLICT_DRAWER_COLS,
    drawerActions: [
      ...EDIT,
      { id: "mark_reviewed", label: "Mark Reviewed", icon: Eye,           color: "#22c55e" },
      { id: "escalate",      label: "Escalate",      icon: AlertTriangle, color: "#f59e0b" },
    ],
    rows,
    kpis,
    entryBtn:      "Declare Conflict",
    formFields:    dynamicConflictFields,
    onRowUpdate: (id, values) => {
      updateConflict(id, {
        meeting_title: values.meeting_title != null ? String(values.meeting_title) : undefined,
        agenda_item:   values.agenda_item   != null ? String(values.agenda_item)   : undefined,
        conflict_type: values.conflict_type != null ? String(values.conflict_type) : undefined,
        description:   values.description   != null ? String(values.description)   : undefined,
        action_taken:  values.action_taken  != null ? String(values.action_taken)  : undefined,
        reviewed_by:   values.reviewed_by   != null ? String(values.reviewed_by)   : undefined,
        review_status: values.approval_status != null ? String(values.approval_status) : undefined,
      } as never);
    },
    onRowCreate: (values) => {
      const conflictId = generateId("COI", conflicts.map(c => c.conflict_id));
      addConflict({
        id: conflictId, conflict_id: conflictId,
        meeting_id:    String(values.meeting_id    ?? ""),
        meeting_title: String(values.meeting_title ?? ""),
        agenda_item:   String(values.agenda_item   ?? ""),
        declared_by:   String(values.declared_by   ?? ""),
        conflict_type: String(values.conflict_type ?? ""),
        description:   String(values.description   ?? ""),
        action_taken:  String(values.action_taken  ?? ""),
        reviewed_by:   String(values.reviewed_by   ?? ""),
        review_status: "Pending",
        created_at:    new Date().toISOString(),
      });
      toast.success(`Conflict declaration ${conflictId} recorded.`);
    },
  };

  return <GenPage cfg={cfg} />;
}
