import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { DECISION_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useDecisionRegistry, generateId } from "../../data/boardMeetingData";
import { DECISION_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";
import { useMeetingRegistry, useGovernanceRegistry } from "../../data/boardMeetingData";

export function PSRApprovalPage() {
  const registry = useDecisionRegistry();
  const meetingReg = useMeetingRegistry();
  const govReg = useGovernanceRegistry();
  const meetingOptions = meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title);
  const govOptions = govReg.items.map(g => g.body_name);
  const formFields = patchFormOptions(DECISION_FORM_FIELDS, {
    source_meeting: meetingOptions,
    committee: govOptions,
    governance_body: govOptions,
  });

  const rows: TableRow[] = registry.items.map(d => ({ ...d, id: d.id }));

  const kpis: KpiDef[] = [
    { label: "Total Decisions",  value: String(rows.length),                                                           tone: "primary" },
    { label: "Implementing",     value: String(rows.filter(r => r.implementation_status === "In Progress").length),    tone: "warning" },
    { label: "Implemented",      value: String(rows.filter(r => r.implementation_status === "Completed").length),      tone: "success" },
    { label: "Not Started",      value: String(rows.filter(r => r.implementation_status === "Not Started").length),    tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Decisions",
    titleKey: "psrApproval.title",
    desc: "Review board and committee decisions, track implementation progress and owners.",
    descKey: "psrApproval.desc",
    cols: [
      fc("decision_title",        "Decision Title",         { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",        "Source Meeting",         { headerKey: "headers.meetingId" }),
      fc("decision_owner",        "Decision Owner",         { headerKey: "headers.submittedBy" }),
      fc("effective_date",        "Effective Date",         { headerKey: "headers.date" }),
      BADGE("implementation_status", "Implementation Status"),
    ],
    mobileCardMapping: {
      primary:    "decision_title",
      identifier: "decision_id",
      meta:       ["source_meeting", "decision_owner", "decision_type"],
      status:     "implementation_status",
      date:       "effective_date",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Decision Details",
    drawerCols: DECISION_DRAWER_COLS,
    rows,
    kpis,
    entryBtn:      "Add Decision",
    formFields:    formFields,
    onRowCreate(values) {
      const decId = generateId("DEC", registry.items.map(d => d.decision_id));
      registry.add({
        id:                      decId,
        decision_id:             decId,
        decision_title:          String(values.decision_title ?? ""),
        source_meeting:          String(values.source_meeting ?? ""),
        agenda_item:             String(values.agenda_item ?? ""),
        decision_type:           String(values.decision_type ?? ""),
        decision_owner:          String(values.decision_owner ?? ""),
        effective_date:          String(values.effective_date ?? ""),
        implementation_deadline: String(values.implementation_deadline ?? ""),
        financial_impact:        String(values.financial_impact ?? ""),
        implementation_status:   "Not Started",
        approval_status:         "Approved",
        created_at:              new Date().toISOString(),
        activity_history:        [{ action: "Decision created", by: "User", at: new Date().toISOString() }],
      });
    },
  };
  return <GenPage cfg={cfg} />;
}
