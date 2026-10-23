import { Shield } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { RETENTION_RULE_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import { RETENTION_FORM_FIELDS, LEGAL_HOLD_FORM_FIELDS } from "../boardMeetingFormFields";
import { useExtensionRequestRegistry, generateId } from "../../data/boardMeetingData";

export function TimeExtensionPage() {
  const registry = useExtensionRequestRegistry();

  const rows = registry.items.map(r => ({
    ...r,
    id:               r.id,
    meeting_title:    r.action_title,
    reschedule_type:  r.extension_reason.split(" ").slice(0, 2).join(" ") || "General",
    committee:        r.action_id,
    new_date:         r.requested_due_date,
    requested_by:     r.approved_by || "Pending",
    approval_status:  r.approval_status,
  }));

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Requests",
    statusField: "approval_status",
    statuses: [
      { value: "Pending",  label: "Pending",  tone: "warning" },
      { value: "Approved", label: "Approved", tone: "success" },
      { value: "Rejected", label: "Rejected", tone: "error" },
    ],
  });

  const cfg: PageCfg = {
    title: "Retention & Legal Holds",
    titleKey: "timeExtension.title",
    desc: "Configure document retention schedules and manage legal hold requests.",
    descKey: "timeExtension.desc",
    cols: [
      fc("meeting_title",   "Action / Policy",   { headerKey: "headers.meetingTitle" }),
      fc("reschedule_type", "Reason Type",        { headerKey: "headers.type" }),
      fc("committee",       "Action Ref.",        { headerKey: "headers.committee" }),
      fc("new_date",        "Requested Due Date", { headerKey: "headers.submissionDate" }),
      fc("requested_by",    "Approved By",        { headerKey: "headers.submittedBy" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: { primary: "meeting_title", meta: ["reschedule_type", "committee"], status: "approval_status", date: "new_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Extension Request Details",
    drawerCols: RETENTION_RULE_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: "Add Extension Request",
    formFields: RETENTION_FORM_FIELDS,
    extraBtns: [
      {
        id: "legal-hold",
        label: "Add Legal Hold",
        icon: Shield,
        tone: "neutral",
        formTitle: "Add Legal Hold",
        formFields: LEGAL_HOLD_FORM_FIELDS,
      },
    ],
    onRowCreate(values) {
      const rId = generateId("EXT", registry.items.map(r => r.request_id));
      registry.add({
        id: rId, request_id: rId,
        action_id:          String(values.action_id           ?? rId),
        action_title:       String(values.action_title        ?? values.meeting_title ?? ""),
        original_due_date:  String(values.original_due_date   ?? ""),
        requested_due_date: String(values.requested_due_date  ?? values.new_date ?? ""),
        extension_reason:   String(values.extension_reason    ?? values.reschedule_type ?? ""),
        approved_by:        String(values.approved_by         ?? ""),
        approval_status:    "Pending",
        created_at:         new Date().toISOString(),
      } as never);
    },
    onRowUpdate(id, values) {
      registry.update(id, {
        action_title:       values.action_title       != null ? String(values.action_title)       : undefined,
        extension_reason:   values.extension_reason   != null ? String(values.extension_reason)   : undefined,
        requested_due_date: values.requested_due_date != null ? String(values.requested_due_date) : undefined,
        approved_by:        values.approved_by        != null ? String(values.approved_by)        : undefined,
        approval_status:    values.approval_status    != null ? String(values.approval_status)    : undefined,
      } as never);
    },
  };
  return <GenPage cfg={cfg} />;
}
