import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { buildPageKpis } from "../../../utils/buildPageKpis";
import { TEMPLATE_FORM_FIELDS } from "../../boardMeetingFormFields";
import { TEMPLATE_DRAWER_COLS } from "../../boardMeetingDrawerSchemas";
import { useMeetingTemplateRegistry, useGovernanceRegistry, generateId } from "../../../data/boardMeetingData";
import { patchFormOptions } from "../../../utils/patchFormOptions";

export function TribunalPage({ isApproval }: { isApproval?: boolean }) {
  const registry = useMeetingTemplateRegistry();
  const govReg = useGovernanceRegistry();
  const dynamicFields = patchFormOptions(TEMPLATE_FORM_FIELDS, {
    committee: govReg.items.map(g => g.body_name),
  });

  const rows = registry.items.map(t => ({
    ...t,
    id:               t.id,
    meeting_title:    t.template_name,
    matter_type:      t.meeting_type,
    committee:        t.committee,
    escalation_date:  t.created_at.slice(0, 10),
    escalated_to:     t.default_duration,
    financial_impact: t.agenda_structure,
    escalation_status:t.status,
    matter_no:        t.template_id,
  }));

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Templates",
    statusField: "escalation_status",
    statuses: [
      { value: "Active",   label: "Active",   tone: "success" },
      { value: "Draft",    label: "Draft",    tone: "neutral" },
      { value: "Inactive", label: "Inactive", tone: "error" },
    ],
  });

  const cfg: PageCfg = {
    title: isApproval ? "Communication Templates" : "Document Templates",
    titleKey: isApproval ? "tribunalApproval.title" : "tribunalRegView.title",
    desc: isApproval ? "Manage email, notification, and invitation communication templates." : "Manage document templates for board papers, resolutions, and meeting records.",
    descKey: isApproval ? "tribunalApproval.desc" : "tribunalRegView.desc",
    cols: [
      fc("meeting_title",  "Template Name",   { headerKey: "headers.meetingTitle" }),
      fc("matter_type",    "Template Type",   { headerKey: "headers.type" }),
      fc("committee",      "Governance Body", { headerKey: "headers.committee" }),
      fc("escalation_date","Created Date",    { headerKey: "headers.date" }),
      fc("escalated_to",   "Duration",        { headerKey: "headers.submissionDate" }),
      fc("financial_impact","Structure",      { headerKey: "headers.amount" }),
      BADGE("escalation_status", "Status"),
    ],
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: isApproval ? "Communication Template Details" : "Document Template Details",
    drawerCols: TEMPLATE_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: isApproval ? "Add Communication Template" : "Add Document Template",
    formFields: dynamicFields,
    mobileCardMapping: {
      primary:    "meeting_title",
      identifier: "matter_no",
      meta:       ["matter_type", "committee"],
      status:     "escalation_status",
      date:       "escalation_date",
    },
    onRowCreate(values) {
      const tId = generateId("TPL", registry.items.map(t => t.template_id));
      registry.add({
        id: tId, template_id: tId,
        template_name:   String(values.template_name   ?? values.meeting_title ?? ""),
        committee:       String(values.committee       ?? ""),
        meeting_type:    String(values.meeting_type    ?? values.matter_type ?? ""),
        default_mode:    String(values.default_mode    ?? "Physical"),
        default_duration:String(values.default_duration?? "120 min"),
        agenda_structure:String(values.agenda_structure?? "Standard"),
        confidentiality: String(values.confidentiality ?? "Confidential"),
        description:     String(values.description     ?? ""),
        status:          "Active",
        created_at:      new Date().toISOString(),
      } as never);
    },
    onRowUpdate(id, values) {
      registry.update(id, {
        template_name:    values.template_name    != null ? String(values.template_name)    : undefined,
        committee:        values.committee        != null ? String(values.committee)        : undefined,
        meeting_type:     values.meeting_type     != null ? String(values.meeting_type)     : undefined,
        default_duration: values.default_duration != null ? String(values.default_duration) : undefined,
        agenda_structure: values.agenda_structure != null ? String(values.agenda_structure) : undefined,
        status:           values.escalation_status!= null ? String(values.escalation_status): undefined,
      } as never);
    },
  };
  return <GenPage cfg={cfg} />;
}
