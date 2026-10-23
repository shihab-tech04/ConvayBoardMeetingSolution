import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { RESOLUTION_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useResolutionRegistry, useMeetingRegistry, useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { RESOLUTION_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function PSREditRequestPage() {
  const registry = useResolutionRegistry();
  const meetingReg = useMeetingRegistry();
  const govReg = useGovernanceRegistry();
  const dynamicFields = patchFormOptions(RESOLUTION_FORM_FIELDS, {
    source_meeting: meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
    committee: govReg.items.map(g => g.body_name),
    governance_body: govReg.items.map(g => g.body_name),
  });

  const rows: TableRow[] = registry.items.map(r => ({ ...r, id: r.id }));

  const kpis: KpiDef[] = [
    { label: "Total Resolutions", value: String(rows.length),                                                    tone: "primary" },
    { label: "Pending",           value: String(rows.filter(r => r.approval_status === "Draft").length),         tone: "warning" },
    { label: "Adopted",           value: String(rows.filter(r => r.approval_status === "Adopted").length),       tone: "success" },
    { label: "Rejected",          value: String(rows.filter(r => r.approval_status === "Rejected").length),      tone: "error" },
  ];

  const cfg: PageCfg = {
    title: "Resolutions",
    titleKey: "psrEditRequest.title",
    desc: "Track formal resolutions, voting results, and implementation status.",
    descKey: "psrEditRequest.desc",
    cols: [
      fc("resolution_title", "Resolution Title",  { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",   "Meeting",           { headerKey: "headers.meetingId" }),
      fc("proposed_by",      "Proposed By",       { headerKey: "headers.submittedBy" }),
      fc("vote_result",      "Voting Result",     { headerKey: "headers.type" }),
      fc("effective_date",   "Effective Date",    { headerKey: "headers.submissionDate" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "resolution_title",
      identifier: "resolution_id",
      meta:       ["source_meeting", "proposed_by", "resolution_type"],
      status:     "approval_status",
      date:       "effective_date",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Resolution Details",
    drawerCols: RESOLUTION_DRAWER_COLS,
    rows,
    kpis,
    entryBtn:      "Add Resolution",
    formFields:    dynamicFields,
    onRowCreate(values) {
      const resId = generateId("RES", registry.items.map(r => r.resolution_id));
      registry.add({
        id:               resId,
        resolution_id:    resId,
        resolution_title: String(values.resolution_title ?? ""),
        resolution_type:  String(values.resolution_type ?? ""),
        source_meeting:   String(values.source_meeting ?? ""),
        source_decision:  String(values.source_decision ?? ""),
        resolution_text:  String(values.resolution_text ?? ""),
        proposed_by:      String(values.proposed_by ?? ""),
        seconded_by:      String(values.seconded_by ?? ""),
        vote_result:      "",
        votes_for:        "0",
        votes_against:    "0",
        abstentions:      "0",
        effective_date:   String(values.effective_date ?? ""),
        approval_status:  "Draft",
        created_at:       new Date().toISOString(),
      });
    },
  };
  return <GenPage cfg={cfg} />;
}
