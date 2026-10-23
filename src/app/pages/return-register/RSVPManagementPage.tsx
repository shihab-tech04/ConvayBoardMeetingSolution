import { Send, RefreshCw, UserCheck, UserX, UserPlus } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { RSVP_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useRSVPRegistry, useMeetingRegistry, useParticipantRegistry, generateId } from "../../data/boardMeetingData";
import { RSVP_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function RSVPManagementPage() {
  const { items: rsvpRecords, add: addRSVP } = useRSVPRegistry();
  const meetingReg = useMeetingRegistry();
  const participantReg = useParticipantRegistry();
  const dynamicFields = patchFormOptions(RSVP_FORM_FIELDS, {
    meeting_id:       meetingReg.items.map(m => m.meeting_id),
    meeting_title:    meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
    participant_id:   participantReg.items.map(p => p.participant_id),
    participant_name: participantReg.items.map(p => p.participant_name ?? p.name),
  });

  const rows: TableRow[] = rsvpRecords.map(r => ({
    ...r,
    id:              r.id,
    proxy_nominee:   r.proxy_nominee || "—",
    decline_reason:  r.decline_reason || "—",
    approval_status: r.response,
  }));

  const kpis: KpiDef[] = [
    { label: "Total Invitations", value: String(rsvpRecords.length),                                                  tone: "primary" },
    { label: "Accepted",          value: String(rsvpRecords.filter(r => r.response === "Accepted").length),           tone: "success" },
    { label: "Pending",           value: String(rsvpRecords.filter(r => r.response === "Pending").length),            tone: "warning" },
    { label: "Declined",          value: String(rsvpRecords.filter(r => r.response === "Declined").length),           tone: "error"   },
    { label: "Tentative",         value: String(rsvpRecords.filter(r => r.response === "Tentative").length),          tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "RSVP & Invitations",
    desc:  "Track participant invitation status, RSVP responses, and manage proxies and leave approvals.",
    cols: [
      fc("meeting_title",   "Meeting",            { headerKey: "headers.meetingTitle" }),
      fc("participant_name","Participant",         { headerKey: "headers.submittedBy" }),
      fc("response",        "Response",           { headerKey: "headers.type" }),
      fc("response_date",   "Response Date",      { headerKey: "headers.date" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "participant_name",
      identifier: "rsvp_id",
      meta:       ["meeting_title", "response_date"],
      status:     "approval_status",
      date:       "created_at",
    },
    filters:       BASE_FILTERS,
    actions:       ROW_VIEW,
    drawerTitle: "Invitation Details",
    drawerCols: RSVP_DRAWER_COLS,
    drawerActions: [
      ...EDIT,
      { id: "send_invitation",    label: "Send Invitation",    icon: Send,        color: "#3b82f6" },
      { id: "resend_invitation",  label: "Resend Invitation",  icon: RefreshCw,   color: "#8b5cf6" },
      { id: "record_response",    label: "Record Response",    icon: UserCheck,   color: "#22c55e" },
      { id: "approve_leave",      label: "Approve Leave",      icon: UserX,       color: "#f59e0b" },
      { id: "assign_alternate",   label: "Assign Alternate",   icon: UserPlus,    color: "#6b7280" },
    ],
    rows,
    kpis,
    entryBtn:      "Record RSVP",
    formFields:    dynamicFields,
    onRowCreate: (values) => {
      const rsvpId = generateId("RSV", rsvpRecords.map(r => r.rsvp_id));
      addRSVP({
        id: rsvpId, rsvp_id: rsvpId,
        meeting_id:       String(values.meeting_id       ?? ""),
        meeting_title:    String(values.meeting_title    ?? ""),
        participant_id:   String(values.participant_id   ?? ""),
        participant_name: String(values.participant_name ?? ""),
        response:         String(values.response         ?? "Pending"),
        response_date:    String(values.response_date    ?? new Date().toISOString().slice(0, 10)),
        decline_reason:   String(values.decline_reason   ?? ""),
        proxy_nominee:    String(values.proxy_nominee    ?? ""),
        notes:            String(values.notes            ?? ""),
        created_at:       new Date().toISOString(),
      });
    },
  };

  return <GenPage cfg={cfg} />;
}
