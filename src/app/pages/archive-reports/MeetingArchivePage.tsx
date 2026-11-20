import { useNavigate } from "react-router";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { archiveRecordPath } from "./archiveRecordPath";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE } from "../modulePageUtils";
import { buildMeetingRegisterFilters } from "../return-register/meetingRegisterReadiness";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { useMeetingRegistry } from "../../data/boardMeetingData";
import { MEETING_DRAWER_COLS } from "../boardMeetingDrawerSchemas";

export function MeetingArchivePage() {
  const navigate = useNavigate();
  const registry = useMeetingRegistry();

  const ARCHIVE_STATUSES = ["Completed", "Archived", "Minutes Approved", "Awaiting Minutes", "Closed"];

  const archived: TableRow[] = registry.items
    .filter(m => ARCHIVE_STATUSES.includes(String(m.approval_status ?? "")))
    .map(m => ({
      ...m,
      id: m.id,
      // The SQL meeting model stores meeting_date, not a separate meeting_year.
      meeting_year: /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(m.meeting_date)
        ? m.meeting_date.slice(0, 4)
        : "",
    }));

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
    filters:  buildMeetingRegisterFilters(archived),
    actions:  [
      ...ROW_VIEW,
    ],
    drawerActions: [
      { id: "view_record", label: "Open Full Meeting Record", icon: ExternalLink, color: "#2563eb" },
    ],
    drawerTitle: "Meeting Details",
    drawerCols: MEETING_DRAWER_COLS,
    rows:     archived,
    dataLoading: Boolean(registry.loading),
    dataError: registry.error ?? null,
    onDataRetry: async () => { await registry.refresh?.(); },
    // A failed or pending authorized SQL read is not proof of an empty archive.
    kpis: registry.loading || registry.error ? [] : kpis,
    onCustomAction(actionId, row) {
      if (actionId === "view_record") {
        try {
          navigate(archiveRecordPath(row.id ?? row.meeting_id));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to open this meeting record.");
        }
      }
    },
  };
  return <GenPage cfg={cfg} />;
}
