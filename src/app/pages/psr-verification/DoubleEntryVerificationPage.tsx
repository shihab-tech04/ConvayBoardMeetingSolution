import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { MATTER_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useMatterArisingRegistry, useMeetingRegistry, useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { MATTER_ARISING_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function DoubleEntryVerificationPage() {
  const registry = useMatterArisingRegistry();
  const meetingReg = useMeetingRegistry();
  const meetingOptions = meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title);
  const dynamicFields = patchFormOptions(MATTER_ARISING_FORM_FIELDS, {
    meeting_id: meetingOptions,
    source_meeting: meetingOptions,
  });
  const govReg = useGovernanceRegistry();

  const items = registry.items;
  const kpis: KpiDef[] = [
    { label: "Total Matters",    value: String(items.length),                                                      tone: "primary" },
    { label: "Open",             value: String(items.filter(m => m.current_status === "Open").length),             tone: "warning" },
    { label: "Overdue",          value: String(items.filter(m => m.current_status === "Overdue").length),          tone: "error"   },
    { label: "Carried Forward",  value: String(items.filter(m => m.current_status === "Carried Forward").length),  tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Matters Arising",
    titleKey: "doubleEntryVerification.title",
    desc: "Track matters arising from previous meetings requiring follow-up action.",
    descKey: "doubleEntryVerification.desc",
    cols: [
      fc("matter_title",    "Matter",            { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",  "Source Meeting",    { headerKey: "headers.meetingId" }),
      fc("owner",           "Responsible Owner", { headerKey: "headers.submittedBy" }),
      fc("due_date",        "Due Date",          { headerKey: "headers.date" }),
      fc("progress",        "Progress",          { headerKey: "headers.amount" }),
      BADGE("current_status", "Status"),
    ],
    mobileCardMapping: { primary: "matter_title", identifier: "matter_id", meta: ["source_meeting", "owner"], status: "current_status", date: "due_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Matter Details",
    drawerCols: MATTER_DRAWER_COLS,
    rows: items.map(m => ({ ...m })),
    kpis,
    entryBtn: "Add Matter",
    formFields: dynamicFields,
    onRowCreate(values) {
      const matId = generateId("MAT", registry.items.map(m => m.matter_id));
      registry.add({
        id: matId, matter_id: matId,
        matter_title:     String(values.matter_title     ?? ""),
        source_meeting:   String(values.source_meeting   ?? ""),
        source_agenda:    String(values.source_agenda    ?? ""),
        source_decision:  String(values.source_decision  ?? ""),
        owner:            String(values.owner            ?? ""),
        due_date:         String(values.due_date         ?? ""),
        current_status:   "Open",
        progress:         "0%",
        delay_reason:     String(values.delay_reason     ?? ""),
        next_review_date: String(values.next_review_date ?? ""),
        target_meeting:   String(values.target_meeting   ?? ""),
        created_at:       new Date().toISOString(),
      });
    },
  };
  return <GenPage cfg={cfg} />;
}
