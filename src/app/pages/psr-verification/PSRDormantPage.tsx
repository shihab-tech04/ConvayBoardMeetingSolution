import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { POLL_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import { FOLLOWUP_QUESTION_FORM_FIELDS } from "../boardMeetingFormFields";
import { useMatterArisingRegistry, useMeetingRegistry, generateId } from "../../data/boardMeetingData";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function PSRDormantPage() {
  const registry = useMatterArisingRegistry();
  const meetingReg = useMeetingRegistry();
  const dynamicFields = patchFormOptions(FOLLOWUP_QUESTION_FORM_FIELDS, {
    source_meeting:  meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
    target_meeting:  meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
  });

  const rows = registry.items.map(m => ({
    ...m,
    id:               m.id,
    meeting_title:    m.matter_title,
    committee:        m.source_agenda,
    submitted_by:     m.owner,
    last_meeting:     m.due_date,
    attendance_status:m.progress || "0%",
    dormant_status:   m.current_status,
    years_dormant:    "0",
  }));

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Matters",
    statusField: "dormant_status",
    statuses: [
      { value: "Open",            label: "Open",            tone: "warning" },
      { value: "In Progress",     label: "In Progress",     tone: "primary" },
      { value: "Overdue",         label: "Overdue",         tone: "error" },
      { value: "Carried Forward", label: "Carried Forward", tone: "neutral" },
    ],
  });

  const cfg: PageCfg = {
    title: "Matters Arising",
    titleKey: "psrDormant.title",
    desc: "Track follow-up matters and actions arising from board and committee meetings.",
    descKey: "psrDormant.desc",
    cols: [
      fc("meeting_title", "Matter",           { headerKey: "headers.meetingTitle" }),
      fc("committee",     "Source Agenda",    { headerKey: "headers.committee" }),
      fc("submitted_by",  "Owner",            { headerKey: "headers.submittedBy" }),
      fc("last_meeting",  "Due Date",         { headerKey: "headers.date" }),
      BADGE("dormant_status", "Status"),
    ],
    mobileCardMapping: { primary: "meeting_title", meta: ["committee", "submitted_by"], status: "dormant_status", date: "last_meeting" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Matter Details",
    drawerCols: POLL_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: "Add Matter",
    formFields: dynamicFields,
    onRowCreate(values) {
      const mId = generateId("MAT", registry.items.map(m => m.matter_id));
      registry.add({
        id: mId, matter_id: mId,
        matter_title:     String(values.matter_title     ?? values.meeting_title ?? ""),
        source_meeting:   String(values.source_meeting   ?? ""),
        source_agenda:    String(values.source_agenda    ?? values.committee ?? ""),
        source_decision:  String(values.source_decision  ?? ""),
        owner:            String(values.owner            ?? values.submitted_by ?? ""),
        due_date:         String(values.due_date         ?? values.last_meeting ?? ""),
        current_status:   "Open",
        progress:         "0%",
        delay_reason:     String(values.delay_reason     ?? ""),
        next_review_date: String(values.next_review_date ?? ""),
        target_meeting:   String(values.target_meeting   ?? ""),
        created_at:       new Date().toISOString(),
      } as never);
    },
    onRowUpdate(id, values) {
      registry.update(id, {
        matter_title:     values.matter_title     != null ? String(values.matter_title)     : undefined,
        owner:            values.owner            != null ? String(values.owner)            : undefined,
        due_date:         values.due_date         != null ? String(values.due_date)         : undefined,
        current_status:   values.dormant_status   != null ? String(values.dormant_status)   : undefined,
        progress:         values.attendance_status!= null ? String(values.attendance_status): undefined,
        next_review_date: values.next_review_date != null ? String(values.next_review_date) : undefined,
      } as never);
    },
  };
  return <GenPage cfg={cfg} />;
}
