import { useNavigate } from "react-router";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { useMeetingRegistry } from "../../data/boardMeetingData";
import { MEETING_DRAWER_COLS } from "../boardMeetingDrawerSchemas";

export function MeetingArchivePage() {
  const navigate = useNavigate();
  const registry = useMeetingRegistry();

  const ARCHIVE_STATUSES = ["Completed", "Archived", "Minutes Approved", "Awaiting Minutes", "Closed"];

  const archived: TableRow[] = registry.items
    .filter(m => ARCHIVE_STATUSES.includes(String(m.approval_status ?? "")))
    .map(m => ({ ...m, id: m.id }));

  const kpis: KpiDef[] = [
    { label: "Archived Meetings",   value: String(archived.length),                                                                   tone: "primary" },
    { label: "Awaiting Minutes",    value: String(archived.filter(r => r.approval_status === "Awaiting Minutes").length),              tone: "warning" },
    { label: "Completed",           value: String(archived.filter(r => r.approval_status === "Completed").length),                    tone: "success" },
    { label: "Minutes Approved",    value: String(archived.filter(r => r.approval_status === "Minutes Approved").length),             tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Meeting Archive",
    desc:  "Archive of completed and closed board and committee meetings. Select a meeting to open its full record.",
    cols: [
      fc("meeting_title",    "Meeting Title",      { headerKey: "headers.meetingTitle" }),
      fc("committee",        "Committee",          { headerKey: "headers.committee" }),
      fc("meeting_date",     "Date",               { headerKey: "headers.date" }),
      fc("chairperson",      "Chairperson",        { headerKey: "headers.submittedBy" }),
      fc("participant_count","Participants",        { headerKey: "headers.totalEntry" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "meeting_title",
      identifier: "meeting_id",
      meta:       ["committee", "chairperson"],
      status:     "approval_status",
      date:       "meeting_date",
    },
    filters:  BASE_FILTERS,
    actions:  [
      ...ROW_VIEW,
    ],
    drawerActions: [],
    drawerTitle: "Meeting Details",
    drawerCols: MEETING_DRAWER_COLS,
    rows:     archived,
    kpis,
    onCustomAction(actionId, row) {
      if (actionId === "view_record") {
        const id = String(row.id ?? row.meeting_id ?? "");
        if (id) navigate(`/meetings/${id}/record`);
      }
    },
  };
  return <GenPage cfg={cfg} />;
}
