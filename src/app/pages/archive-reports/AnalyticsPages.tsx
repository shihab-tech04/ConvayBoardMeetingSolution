import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import {
  MEETING_DRAWER_COLS,
  GOV_BODY_DRAWER_COLS,
  DECISION_DRAWER_COLS,
} from "../boardMeetingDrawerSchemas";
import {
  useMeetingRegistry,
  useDecisionRegistry,
  useActionItemRegistry,
  useResolutionRegistry,
  useGovernanceRegistry,
} from "../../data/boardMeetingData";

// ─── Meeting Performance ────────────────────────────────────────────────────

export function MeetingPerformanceAnalyticsPage() {
  const registry = useMeetingRegistry();

  const rows: TableRow[] = registry.items.map(m => ({
    id:               m.id,
    meeting_id:       m.meeting_id,
    meeting_title:    m.meeting_title,
    committee:        m.committee,
    meeting_type:     m.meeting_type,
    meeting_date:     m.meeting_date,
    chairperson:      m.chairperson,
    agenda_count:     m.agenda_count,
    participant_count: m.participant_count,
    quorum_forecast:  m.quorum_forecast,
    readiness:        m.readiness,
    approval_status:  m.approval_status,
  }));

  const completed  = rows.filter(r => r.approval_status === "Completed" || r.approval_status === "Minutes Approved").length;
  const cancelled  = rows.filter(r => r.approval_status === "Cancelled").length;
  const scheduled  = rows.filter(r => r.approval_status === "Scheduled").length;
  const quorumMet  = rows.filter(r => r.quorum_forecast === "Met" || r.quorum_forecast === "Yes").length;

  const kpis: KpiDef[] = [
    { label: "Total Meetings", value: String(rows.length),  tone: "primary" },
    { label: "Completed",      value: String(completed),    tone: "success" },
    { label: "Scheduled",      value: String(scheduled),    tone: "warning" },
    { label: "Cancelled",      value: String(cancelled),    tone: "error"   },
    { label: "Quorum Met",     value: String(quorumMet),    tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Meeting Performance",
    desc:  "Analyse meeting completion rates, quorum compliance, and operational efficiency.",
    cols: [
      fc("meeting_title",    "Meeting",      { headerKey: "headers.meetingTitle" }),
      fc("committee",        "Committee",    { headerKey: "headers.committee" }),
      fc("meeting_date",     "Date",         { headerKey: "headers.date" }),
      fc("agenda_count",     "Agenda Items", { headerKey: "headers.totalEntry" }),
      fc("participant_count","Participants", { headerKey: "headers.type" }),
      fc("quorum_forecast",  "Quorum",       { headerKey: "headers.reason" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "meeting_title",
      identifier: "meeting_id",
      meta:       ["committee", "meeting_type", "quorum_forecast"],
      status:     "approval_status",
      date:       "meeting_date",
    },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerTitle: "Meeting Details",
    drawerCols:  MEETING_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Participation Analytics ────────────────────────────────────────────────

export function ParticipationAnalyticsPage() {
  const registry = useMeetingRegistry();

  const rows: TableRow[] = registry.items.map(m => ({
    id:               m.id,
    meeting_id:       m.meeting_id,
    meeting_title:    m.meeting_title,
    committee:        m.committee,
    meeting_type:     m.meeting_type,
    meeting_date:     m.meeting_date,
    chairperson:      m.chairperson,
    secretary:        m.secretary,
    participant_count: m.participant_count,
    quorum_forecast:  m.quorum_forecast,
    mode:             m.mode,
    approval_status:  m.approval_status,
  }));

  const totalParticipants = rows.reduce((sum, r) => sum + (parseInt(String(r.participant_count)) || 0), 0);
  const avgParticipants   = rows.length ? Math.round(totalParticipants / rows.length) : 0;
  const inPerson          = rows.filter(r => r.mode === "In-Person" || r.mode === "Physical").length;
  const virtual           = rows.filter(r => r.mode === "Virtual" || r.mode === "Online").length;

  const kpis: KpiDef[] = [
    { label: "Total Meetings",     value: String(rows.length),         tone: "primary" },
    { label: "Total Participants", value: String(totalParticipants),   tone: "neutral" },
    { label: "Avg Per Meeting",    value: String(avgParticipants),     tone: "success" },
    { label: "In-Person",          value: String(inPerson),            tone: "warning" },
    { label: "Virtual",            value: String(virtual),             tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Participation Analytics",
    desc:  "Track member attendance, quorum compliance, and participation patterns across meetings.",
    cols: [
      fc("meeting_title",    "Meeting",      { headerKey: "headers.meetingTitle" }),
      fc("committee",        "Committee",    { headerKey: "headers.committee" }),
      fc("meeting_date",     "Date",         { headerKey: "headers.date" }),
      fc("mode",             "Mode",         { headerKey: "headers.type" }),
      fc("participant_count","Participants", { headerKey: "headers.totalEntry" }),
      fc("quorum_forecast",  "Quorum",       { headerKey: "headers.reason" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "meeting_title",
      identifier: "meeting_id",
      meta:       ["committee", "mode", "participant_count"],
      status:     "approval_status",
      date:       "meeting_date",
    },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerTitle: "Meeting Details",
    drawerCols:  MEETING_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Governance Report ──────────────────────────────────────────────────────

export function GovernanceReportPage() {
  const meetingReg    = useMeetingRegistry();
  const governanceReg = useGovernanceRegistry();
  const resolutionReg = useResolutionRegistry();

  const rows: TableRow[] = governanceReg.items.map(g => {
    const bodyMeetings    = meetingReg.items.filter(m => m.committee === g.body_name);
    const bodyResolutions = resolutionReg.items.filter(r => bodyMeetings.some(m => m.meeting_id === r.source_meeting));
    return {
      id:                 g.id,
      body_id:            g.body_id,
      body_name:          g.body_name,
      body_type:          g.body_type,
      chairperson:        g.chairperson,
      secretary:          g.secretary,
      member_count:       g.member_count,
      quorum_requirement: g.quorum_requirement,
      voting_method:      g.voting_method,
      meetings_held:      String(bodyMeetings.length),
      resolutions_passed: String(bodyResolutions.filter(r => r.approval_status === "Adopted").length),
      establishment_date: g.establishment_date,
      mandate:            g.mandate,
      status:             g.status,
    };
  });

  const kpis: KpiDef[] = [
    { label: "Governance Bodies",   value: String(rows.length),                                             tone: "primary" },
    { label: "Active",              value: String(rows.filter(r => r.status === "Active").length),          tone: "success" },
    { label: "Total Meetings",      value: String(meetingReg.items.length),                                 tone: "neutral" },
    { label: "Resolutions Adopted", value: String(resolutionReg.items.filter(r => r.approval_status === "Adopted").length), tone: "warning" },
  ];

  const cfg: PageCfg = {
    title: "Governance Report",
    desc:  "Governance body performance, compliance, and activity overview.",
    cols: [
      fc("body_name",         "Governance Body", { headerKey: "headers.meetingTitle" }),
      fc("body_type",         "Type",            { headerKey: "headers.meetingType" }),
      fc("chairperson",       "Chairperson",     { headerKey: "headers.submittedBy" }),
      fc("member_count",      "Members",         { headerKey: "headers.totalEntry" }),
      fc("meetings_held",     "Meetings Held",   { headerKey: "headers.type" }),
      fc("resolutions_passed","Resolutions",     { headerKey: "headers.reason" }),
      BADGE("status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "body_name",
      identifier: "body_id",
      meta:       ["body_type", "chairperson", "meetings_held"],
      status:     "status",
      date:       "establishment_date",
    },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerTitle: "Governance Body Details",
    drawerCols:  GOV_BODY_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Decisions & Actions Analytics ─────────────────────────────────────────

export function DecisionsActionsAnalyticsPage() {
  const decisionReg = useDecisionRegistry();
  const actionReg   = useActionItemRegistry();
  const today       = new Date().toISOString().slice(0, 10);

  const rows: TableRow[] = decisionReg.items.map(d => {
    const linked = actionReg.items.filter(a => a.source_decision === d.decision_id);
    return {
      id:                    d.id,
      decision_id:           d.decision_id,
      decision_title:        d.decision_title,
      source_meeting:        d.source_meeting,
      decision_owner:        d.decision_owner,
      decision_type:         d.decision_type,
      effective_date:        d.effective_date,
      financial_impact:      d.financial_impact,
      linked_actions:        String(linked.length),
      completed_actions:     String(linked.filter(a => a.implementation_status === "Completed").length),
      implementation_status: d.implementation_status,
      approval_status:       d.approval_status,
    };
  });

  const overdueActions = actionReg.items.filter(
    a => a.due_date && a.due_date < today && a.implementation_status !== "Completed"
  ).length;

  const kpis: KpiDef[] = [
    { label: "Total Decisions", value: String(decisionReg.items.length),                                                     tone: "primary" },
    { label: "Total Actions",   value: String(actionReg.items.length),                                                       tone: "neutral" },
    { label: "Implemented",     value: String(decisionReg.items.filter(d => d.implementation_status === "Completed").length), tone: "success" },
    { label: "Overdue Actions", value: String(overdueActions),                                                                tone: "error"   },
  ];

  const cfg: PageCfg = {
    title: "Decisions & Actions",
    desc:  "Track decision implementation progress and linked action item completion rates.",
    cols: [
      fc("decision_title",        "Decision",       { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",        "Meeting",        { headerKey: "headers.meetingId" }),
      fc("decision_owner",        "Owner",          { headerKey: "headers.submittedBy" }),
      fc("effective_date",        "Effective Date", { headerKey: "headers.date" }),
      fc("linked_actions",        "Actions",        { headerKey: "headers.totalEntry" }),
      fc("completed_actions",     "Completed",      { headerKey: "headers.type" }),
      BADGE("implementation_status", "Implementation"),
    ],
    mobileCardMapping: {
      primary:    "decision_title",
      identifier: "decision_id",
      meta:       ["source_meeting", "decision_owner", "linked_actions"],
      status:     "implementation_status",
      date:       "effective_date",
    },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerTitle: "Decision Details",
    drawerCols:  DECISION_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}

// ─── Financial Resource Impact ──────────────────────────────────────────────

export function FinancialResourceImpactPage() {
  const decisionReg = useDecisionRegistry();

  const withImpact = decisionReg.items.filter(
    d => d.financial_impact && d.financial_impact !== "N/A" && d.financial_impact !== ""
  );

  const rows: TableRow[] = withImpact.map(d => ({
    id:                    d.id,
    decision_id:           d.decision_id,
    decision_title:        d.decision_title,
    source_meeting:        d.source_meeting,
    decision_owner:        d.decision_owner,
    decision_type:         d.decision_type,
    effective_date:        d.effective_date,
    financial_impact:      d.financial_impact,
    implementation_status: d.implementation_status,
    approval_status:       d.approval_status,
  }));

  const implemented = rows.filter(r => r.implementation_status === "Completed").length;
  const pending     = rows.filter(r => r.implementation_status !== "Completed").length;

  const kpis: KpiDef[] = [
    { label: "Decisions with Financial Impact", value: String(rows.length), tone: "primary" },
    { label: "Implemented",                     value: String(implemented), tone: "success" },
    { label: "Pending Implementation",          value: String(pending),     tone: "warning" },
  ];

  const cfg: PageCfg = {
    title: "Financial & Resource Impact",
    desc:  "Track decisions with financial implications and their implementation status.",
    cols: [
      fc("decision_title",   "Decision",          { headerKey: "headers.meetingTitle" }),
      fc("source_meeting",   "Meeting",           { headerKey: "headers.meetingId" }),
      fc("decision_owner",   "Owner",             { headerKey: "headers.submittedBy" }),
      fc("financial_impact", "Financial Impact",  { headerKey: "headers.amount" }),
      fc("effective_date",   "Effective Date",    { headerKey: "headers.date" }),
      BADGE("implementation_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "decision_title",
      identifier: "decision_id",
      meta:       ["source_meeting", "decision_owner"],
      status:     "implementation_status",
      amount:     "financial_impact",
      date:       "effective_date",
    },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerTitle: "Decision Details",
    drawerCols:  DECISION_DRAWER_COLS,
    rows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}
