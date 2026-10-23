import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { TEMPLATE_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import { MEETING_TEMPLATE_FORM_FIELDS } from "../boardMeetingFormFields";
import { useMeetingTemplateRegistry, useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function OnlineArchivePage() {
  const registry = useMeetingTemplateRegistry();
  const govReg = useGovernanceRegistry();
  const dynamicFields = patchFormOptions(MEETING_TEMPLATE_FORM_FIELDS, {
    committee: govReg.items.map(g => g.body_name),
    governance_body: govReg.items.map(g => g.body_name),
  });

  const rows = registry.items.map(t => ({
    ...t,
    id:                   t.id,
    meeting_title:        t.template_name,
    meeting_type:         t.meeting_type,
    committee:            t.committee,
    default_agenda_items: t.agenda_structure,
    default_duration:     t.default_duration,
    archive_date:         t.created_at.slice(0, 10),
    approval_status:      t.status,
  }));

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Templates",
    statusField: "approval_status",
    statuses: [
      { value: "Active",   label: "Active",   tone: "success" },
      { value: "Draft",    label: "Draft",    tone: "neutral" },
      { value: "Inactive", label: "Inactive", tone: "error" },
    ],
  });

  const cfg: PageCfg = {
    title: "Meeting Templates",
    titleKey: "onlineArchive.title",
    desc: "Manage reusable meeting and agenda templates for governance bodies.",
    descKey: "onlineArchive.desc",
    cols: [
      fc("meeting_title",       "Template Name",       { headerKey: "headers.meetingTitle" }),
      fc("meeting_type",        "Meeting Type",        { headerKey: "headers.meetingType" }),
      fc("committee",           "Governance Body",     { headerKey: "headers.committee" }),
      fc("default_agenda_items","Agenda Structure",    { headerKey: "headers.totalEntry" }),
      fc("default_duration",    "Default Duration",    { headerKey: "headers.totalRelatedRevenue" }),
      fc("archive_date",        "Created",             { headerKey: "headers.date" }),
      BADGE("approval_status",  "Status"),
    ],
    mobileCardMapping: { primary: "meeting_title", meta: ["committee", "meeting_type"], status: "approval_status", date: "archive_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Template Details",
    drawerCols: TEMPLATE_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: "Add Meeting Template",
    formFields: dynamicFields,
    onRowCreate(values) {
      const tId = generateId("TPL", registry.items.map(t => t.template_id));
      registry.add({
        id: tId, template_id: tId,
        template_name:   String(values.template_name   ?? ""),
        committee:       String(values.committee       ?? ""),
        meeting_type:    String(values.meeting_type    ?? ""),
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
        default_mode:     values.default_mode     != null ? String(values.default_mode)     : undefined,
        default_duration: values.default_duration != null ? String(values.default_duration) : undefined,
        agenda_structure: values.agenda_structure != null ? String(values.agenda_structure) : undefined,
        description:      values.description      != null ? String(values.description)      : undefined,
        status:           values.approval_status  != null ? String(values.approval_status)  : undefined,
      } as never);
    },
  };
  return <GenPage cfg={cfg} />;
}
