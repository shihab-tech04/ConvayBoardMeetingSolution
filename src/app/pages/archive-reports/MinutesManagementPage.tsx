import { Eye, RefreshCw, CheckCircle, Archive } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, FilterDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { EDIT } from "../../data/modulePageConfigs";
import { MINUTES_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useMinutesRegistry, useMeetingRegistry, generateId } from "../../data/boardMeetingData";
import { MINUTES_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";

const STATUS_FLOW = ["Draft", "Under Secretary Review", "Under Chairperson Review", "Member Review", "Revision Requested", "Approved", "Signed", "Archived"];

export function MinutesManagementPage() {
  const registry = useMinutesRegistry();
  const meetingReg = useMeetingRegistry();
  const dynamicFields = patchFormOptions(MINUTES_FORM_FIELDS, {
    meeting_id: meetingReg.items.map(m => m.meeting_id),
    related_meeting: meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
  });

  const items = registry.items;

  const filters: FilterDef[] = [
    ...BASE_FILTERS,
    { key: "approval_status", label: "Status", labelKey: "labels.status", type: "select",
      options: ["All Status", ...STATUS_FLOW],
      optionKeys: { "All Status": "options.allStatus" } },
  ];

  const kpis: KpiDef[] = [
    { label: "Total Minutes",  value: String(items.length),                                                         tone: "primary" },
    { label: "Draft",          value: String(items.filter(m => m.approval_status === "Draft").length),              tone: "neutral" },
    { label: "Under Review",   value: String(items.filter(m => m.approval_status?.includes("Review")).length),      tone: "warning" },
    { label: "Approved",       value: String(items.filter(m => m.approval_status === "Approved" || m.approval_status === "Signed").length), tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Minutes Management",
    titleKey: "minutesManagement.title",
    desc: "Manage board and committee meeting minutes — drafting, review, approval, and archiving.",
    descKey: "minutesManagement.desc",
    cols: [
      fc("minutes_id",    "Minutes ID",    { headerKey: "headers.psrNo" }),
      fc("meeting_title", "Meeting Title", { headerKey: "headers.meetingTitle" }),
      fc("minute_taker",  "Minute Taker",  { headerKey: "headers.submittedBy" }),
      fc("version",       "Version",       { headerKey: "headers.totalEntry" }),
      fc("created_at",    "Created",       { headerKey: "headers.date" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "meeting_title",
      identifier: "minutes_id",
      meta:       ["minute_taker", "version"],
      status:     "approval_status",
      date:       "created_at",
    },
    filters,
    actions: [
      { id: "view", label: "View Details", labelKey: "actions.viewDetails", icon: Eye },
    ],
    drawerTitle: "Minutes Details",
    drawerCols: MINUTES_DRAWER_COLS,
    drawerActions: [
      ...EDIT,
      { id: "request_revision", label: "Request Revision", labelKey: "actions.requestRevision", icon: RefreshCw, color: "#f59e0b" },
      { id: "publish",          label: "Sign & Approve",   labelKey: "actions.publish",          icon: CheckCircle, color: "#22c55e" },
      { id: "archive",          label: "Archive",          labelKey: "actions.archive",           icon: Archive, color: "#6b7280" },
    ],
    rows: items.map(m => ({ ...m } as TableRow)),
    kpis,
    entryBtn: "Create Minutes",
    formFields: dynamicFields,
    onRowCreate(values) {
      const minsId = generateId("MIN", registry.items.map(m => m.minutes_id));
      registry.add({
        id:                 minsId,
        minutes_id:         minsId,
        meeting_id:         String(values.meeting_id         ?? ""),
        meeting_title:      String(values.meeting_title      ?? ""),
        minutes_template:   String(values.minutes_template   ?? "Standard"),
        minute_taker:       String(values.minute_taker       ?? ""),
        co_authors:         String(values.co_authors         ?? ""),
        quorum_statement:   String(values.quorum_statement   ?? ""),
        discussion_summary: String(values.discussion_summary ?? ""),
        next_meeting_date:  String(values.next_meeting_date  ?? ""),
        closing_time:       String(values.closing_time       ?? ""),
        version:            "1.0",
        approval_status:    "Draft",
        created_at:         new Date().toISOString(),
      });
    },
  };

  return <GenPage cfg={cfg} />;
}
