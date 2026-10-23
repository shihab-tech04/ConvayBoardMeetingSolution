import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { KpiDef, PageCfg, TableRow, StatusTabDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, MEETING_FULL_ACTIONS } from "../../data/modulePageConfigs";
import { MEETING_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useMeetingRegistry } from "../../data/boardMeetingData";
import { MeetingContextualModals } from "../meetings/MeetingContextualModals";

export function ReturnViewApprovalPage() {
  const navigate = useNavigate();
  const registry = useMeetingRegistry();

  const [ctxMeeting, setCtxMeeting] = useState<TableRow | null>(null);
  const [ctxAction,  setCtxAction]  = useState<string | null>(null);

  const handleCustomAction = useCallback((actionId: string, row: TableRow) => {
    const mid = (row.meeting_id ?? row.id) as string;
    if (actionId === "start" || actionId === "start_meeting") {
      navigate(`/meetings/${mid}/live?entry=start_meeting`);
      return;
    }
    if (actionId === "join_live" || actionId === "join_meeting") {
      navigate(`/meetings/${mid}/live?entry=join_meeting`);
      return;
    }
    if (actionId === "resume_meeting") {
      navigate(`/meetings/${mid}/live?entry=resume_meeting`);
      return;
    }
    setCtxMeeting(row);
    setCtxAction(actionId);
  }, [navigate]);

  const handleCtxClose = useCallback(() => {
    setCtxMeeting(null);
    setCtxAction(null);
  }, []);

  const handleMeetingUpdate = useCallback((id: string, values: Record<string, unknown>) => {
    registry.update(id, values as never);
  }, [registry]);

  const rows: TableRow[] = registry.items.map(m => ({
    ...m,
    id: m.id,
    meeting_id:      m.meeting_id ?? m.id,
    submitted_by:    m.organizer,
    readiness:       m.quorum_forecast ?? "—",
    quorum_forecast: m.quorum_forecast ?? "—",
  }));

  const kpis: KpiDef[] = [
    { label: "Upcoming Meetings",  value: String(rows.filter(r => r.approval_status === "Draft" || r.approval_status === "Scheduled").length), tone: "primary" },
    { label: "Pending Approval",   value: String(rows.filter(r => r.approval_status === "Pending Approval").length), tone: "warning" },
    { label: "In Progress",        value: String(rows.filter(r => r.approval_status === "In Progress").length), tone: "primary" },
    { label: "Completed",          value: String(rows.filter(r => r.approval_status === "Approved").length), tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Meeting Overview",
    titleKey: "returnViewApproval.title",
    desc: "Review upcoming meetings, their readiness, quorum forecast, and current status.",
    descKey: "returnViewApproval.desc",
    cols: [
      fc("meeting_title",    "Meeting",          { headerKey: "headers.meetingTitle" }),
      fc("committee",        "Governance Body",  { headerKey: "headers.committee" }),
      fc("meeting_date",     "Date & Time",      { headerKey: "headers.date" }),
      fc("readiness",        "Readiness",        { headerKey: "headers.type" }),
      fc("quorum_forecast",  "Quorum",           { headerKey: "headers.totalEntry" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: { primary: "meeting_title", identifier: "meeting_id", meta: ["committee", "submitted_by"], status: "approval_status", date: "meeting_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: MEETING_FULL_ACTIONS,
    drawerTitle: "Meeting Details",
    drawerCols: MEETING_DRAWER_COLS,
    rows,
    kpis,
    entryBtn:         "Create Meeting",
    onEntryBtnClick:  () => navigate("/meetings/all-meetings?create=1"),
    statusTabField: "approval_status",
    statusTabs: [
      { id: "Draft",           label: "Draft"           },
      { id: "Scheduled",       label: "Scheduled"       },
      { id: "Pending Approval",label: "Pending Approval"},
      { id: "In Progress",     label: "In Progress"     },
      { id: "Approved",        label: "Approved"        },
      { id: "Completed",       label: "Completed"       },
      { id: "Cancelled",       label: "Cancelled"       },
    ] satisfies StatusTabDef[],
    onCustomAction:  handleCustomAction,
    onRowUpdate: (id, values) => {
      registry.update(id, {
        meeting_title:    values.meeting_title    != null ? String(values.meeting_title)    : undefined,
        meeting_type:     values.meeting_type     != null ? String(values.meeting_type)     : undefined,
        committee:        values.committee        != null ? String(values.committee)        : undefined,
        meeting_date:     values.meeting_date     != null ? String(values.meeting_date)     : undefined,
        start_time:       values.start_time       != null ? String(values.start_time)       : undefined,
        end_time:         values.end_time         != null ? String(values.end_time)         : undefined,
        mode:             values.mode             != null ? String(values.mode)             : undefined,
        venue:            values.venue            != null ? String(values.venue)            : undefined,
        chairperson:      values.chairperson      != null ? String(values.chairperson)      : undefined,
        secretary:        values.secretary        != null ? String(values.secretary)        : undefined,
        priority:         values.priority         != null ? String(values.priority)         : undefined,
        purpose:          values.purpose          != null ? String(values.purpose)          : undefined,
      } as never);
    },
  };

  return (
    <>
      <GenPage cfg={cfg} />
      <MeetingContextualModals
        meeting={ctxMeeting}
        actionId={ctxAction}
        onClose={handleCtxClose}
        onMeetingUpdate={handleMeetingUpdate}
      />
    </>
  );
}
