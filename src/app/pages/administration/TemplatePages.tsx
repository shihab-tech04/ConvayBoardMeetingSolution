/**
 * Template administration pages:
 *  - MeetingAgendaTemplatesPage
 *  - MinutesResolutionTemplatesPage
 *  - DocumentTemplatesPage
 *  - CommunicationTemplatesPage
 */
import {
  Pencil, Copy, Archive, Download, Eye,
  CheckCircle, Pause, Send, Play,
} from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow, KpiDef, ColDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, gen, CIRCLES_DATA, dg } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { TEMPLATE_DRAWER_COLS } from "../boardMeetingDrawerSchemas";

// ─── Local sample data ────────────────────────────────────────────────────────

const AGENDA_TEMPLATE_NAMES = [
  "Standard Board Meeting Agenda", "Annual General Meeting Agenda", "Emergency Board Meeting Agenda",
  "Executive Committee Agenda", "Audit Committee Agenda", "Risk Committee Agenda",
  "Strategy Session Agenda", "Shariah Committee Agenda", "NRC Meeting Agenda",
  "IT Steering Committee Agenda",
];

const agendaTemplateRows: TableRow[] = gen(20, i => ({
  template_id:   `AT-${String(1000 + i).padStart(4, "0")}`,
  template_name: AGENDA_TEMPLATE_NAMES[i % 10],
  template_type: "Agenda",
  committee:     CIRCLES_DATA[i % 8],
  meeting_type:  ["Regular", "Extraordinary", "Emergency", "Annual"][i % 4],
  language:      ["English", "Bengali", "Both"][i % 3],
  agenda_count:  String((i % 8) + 3),
  document_count: String((i % 5) + 1),
  version:       `v${(i % 3) + 1}.0`,
  status:        ["Active", "Inactive", "Draft"][i % 3],
  created_by:    ["Company Secretary", "System Admin", "Governance Officer"][i % 3],
  created_at:    `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  updated_at:    `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  description:   `Standard agenda template for ${AGENDA_TEMPLATE_NAMES[i % 10]}.`,
}));

const MINUTES_TEMPLATE_NAMES = [
  "Standard Board Meeting Minutes", "AGM Minutes Template", "Executive Committee Minutes",
  "Audit Committee Minutes", "Risk Committee Minutes", "Special Meeting Minutes",
  "Board Resolution Template", "Committee Resolution Template",
];

const minutesTemplateRows: TableRow[] = gen(18, i => ({
  template_id:   `MT-${String(2000 + i).padStart(4, "0")}`,
  template_name: MINUTES_TEMPLATE_NAMES[i % 8],
  template_type: i % 3 === 0 ? "Resolution" : "Minutes",
  committee:     CIRCLES_DATA[i % 8],
  meeting_type:  ["Regular", "Extraordinary", "Annual"][i % 3],
  language:      ["English", "Bengali", "Both"][i % 3],
  version:       `v${(i % 4) + 1}.${i % 3}`,
  status:        ["Active", "Inactive", "Draft"][i % 3],
  created_by:    ["Company Secretary", "System Admin"][i % 2],
  created_at:    `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  updated_at:    `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  agenda_count:  String((i % 4) + 2),
  document_count: String((i % 3) + 1),
  description:   `Minutes/resolution template for ${CIRCLES_DATA[i % 8]}.`,
}));

const DOC_TEMPLATE_NAMES = [
  "Board Paper Template", "Meeting Notice Template", "Agenda Cover Sheet",
  "Attendance Register Template", "Conflict Declaration Form", "RSVP Form Template",
  "Board Pack Cover Template", "Resolution Certificate Template",
  "Action Item Tracking Sheet", "Governance Report Template",
];

const docTemplateRows: TableRow[] = gen(22, i => ({
  template_id:   `DT-${String(3000 + i).padStart(4, "0")}`,
  template_name: DOC_TEMPLATE_NAMES[i % 10],
  template_type: "Document",
  category:      ["Board Paper", "Notice", "Form", "Report", "Certificate"][i % 5],
  committee:     CIRCLES_DATA[i % 8],
  language:      ["English", "Bengali", "Both"][i % 3],
  version:       `v${(i % 3) + 1}.${i % 4}`,
  file_format:   ["DOCX", "PDF", "XLSX", "PPTX"][i % 4],
  status:        ["Active", "Inactive", "Draft"][i % 3],
  created_by:    ["Company Secretary", "System Admin", "Governance Officer"][i % 3],
  created_at:    `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  updated_at:    `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  agenda_count:  "—",
  document_count: String((i % 4) + 1),
  description:   `Standard ${DOC_TEMPLATE_NAMES[i % 10]} for governance documentation.`,
  meeting_type:  ["All", "Board", "Committee"][i % 3],
}));

const COMM_TEMPLATE_NAMES = [
  "Meeting Invitation Email", "RSVP Reminder", "Agenda Distribution Notice",
  "Board Pack Ready Notification", "Meeting Minutes Distribution",
  "Action Item Reminder", "Approval Request Email", "Rejection Notice",
  "Escalation Alert", "Meeting Cancellation Notice",
  "Quorum Warning Alert", "Resolution Publication Notice",
];

const commTemplateRows: TableRow[] = gen(24, i => ({
  template_id:   `CT-${String(4000 + i).padStart(4, "0")}`,
  template_name: COMM_TEMPLATE_NAMES[i % 12],
  template_type: "Communication",
  channel:       ["Email", "SMS", "System Notification", "Portal Alert"][i % 4],
  trigger_event: [
    "Meeting Scheduled", "RSVP Pending", "Agenda Published",
    "Board Pack Released", "Minutes Distributed", "Action Due Soon",
  ][i % 6],
  language:      ["English", "Bengali", "Both"][i % 3],
  committee:     CIRCLES_DATA[i % 8],
  status:        ["Active", "Inactive", "Draft"][i % 3],
  created_by:    ["Company Secretary", "System Admin"][i % 2],
  created_at:    `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  updated_at:    `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  version:       `v${(i % 3) + 1}.0`,
  agenda_count:  "—",
  document_count: "—",
  description:   `Communication template for ${COMM_TEMPLATE_NAMES[i % 12]}.`,
  meeting_type:  "All",
}));

// ─── Extended drawer schema for communication templates ───────────────────────

const COMM_TEMPLATE_DRAWER_COLS: ColDef[] = [
  dg("Template", [
    { key: "template_id",    label: "Template ID" },
    { key: "template_name",  label: "Template Name" },
    { key: "template_type",  label: "Type" },
    { key: "status",         label: "Status", badge: true },
    { key: "description",    label: "Description" },
  ]),
  dg("Delivery Configuration", [
    { key: "channel",        label: "Delivery Channel" },
    { key: "trigger_event",  label: "Trigger Event" },
    { key: "language",       label: "Language" },
    { key: "committee",      label: "Applies To" },
  ]),
  dg("Version & Authorship", [
    { key: "version",     label: "Version" },
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
    { key: "updated_at",  label: "Last Updated" },
  ]),
];

const DOC_TEMPLATE_DRAWER_COLS: ColDef[] = [
  dg("Template", [
    { key: "template_id",    label: "Template ID" },
    { key: "template_name",  label: "Template Name" },
    { key: "template_type",  label: "Type" },
    { key: "category",       label: "Category" },
    { key: "status",         label: "Status", badge: true },
    { key: "description",    label: "Description" },
  ]),
  dg("Scope", [
    { key: "committee",    label: "Governance Body" },
    { key: "meeting_type", label: "Meeting Type" },
    { key: "language",     label: "Language" },
    { key: "file_format",  label: "File Format" },
  ]),
  dg("Version", [
    { key: "version",     label: "Version" },
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
    { key: "updated_at",  label: "Last Updated" },
  ]),
];

// ─── Pages ────────────────────────────────────────────────────────────────────

export function MeetingAgendaTemplatesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Templates",  value: String(agendaTemplateRows.length),                                           tone: "primary"  },
    { label: "Active",           value: String(agendaTemplateRows.filter(r => r.status === "Active").length),        tone: "success"  },
    { label: "Draft",            value: String(agendaTemplateRows.filter(r => r.status === "Draft").length),         tone: "neutral"  },
    { label: "Inactive",         value: String(agendaTemplateRows.filter(r => r.status === "Inactive").length),      tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Meeting & Agenda Templates",
    desc:  "Manage reusable meeting agenda templates for different governance bodies and meeting types.",
    cols: [
      fc("template_id",   "Template ID"),
      fc("template_name", "Template Name"),
      fc("committee",     "Governance Body"),
      fc("meeting_type",  "Meeting Type"),
      fc("language",      "Language"),
      fc("version",       "Version"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "template_name",
      identifier: "template_id",
      meta:       ["committee", "meeting_type", "language"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Agenda Template Details",
    drawerCols:   TEMPLATE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Template",  icon: Pencil,      color: "#3b82f6" },
      { id: "preview",    label: "Preview",        icon: Eye,         color: "#8b5cf6" },
      { id: "activate",   label: "Activate",       icon: CheckCircle, color: "#22c55e" },
      { id: "duplicate",  label: "Duplicate",      icon: Copy,        color: "#6b7280" },
      { id: "download",   label: "Download",       icon: Download,    color: "#6b7280" },
      { id: "archive",    label: "Archive",        icon: Archive,     color: "#ef4444" },
    ],
    rows:      agendaTemplateRows,
    kpis,
    entryBtn:  "Create Agenda Template",
    searchPlaceholder: "Search agenda templates",
  };

  return <GenPage cfg={cfg} />;
}

export function MinutesResolutionTemplatesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Templates",  value: String(minutesTemplateRows.length),                                          tone: "primary"  },
    { label: "Active",           value: String(minutesTemplateRows.filter(r => r.status === "Active").length),       tone: "success"  },
    { label: "Draft",            value: String(minutesTemplateRows.filter(r => r.status === "Draft").length),        tone: "neutral"  },
    { label: "Inactive",         value: String(minutesTemplateRows.filter(r => r.status === "Inactive").length),     tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Minutes & Resolution Templates",
    desc:  "Manage standardised templates for meeting minutes, resolutions, and related governance documents.",
    cols: [
      fc("template_id",   "Template ID"),
      fc("template_name", "Template Name"),
      fc("template_type", "Type"),
      fc("committee",     "Governance Body"),
      fc("language",      "Language"),
      fc("version",       "Version"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "template_name",
      identifier: "template_id",
      meta:       ["template_type", "committee", "language"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Minutes Template Details",
    drawerCols:   TEMPLATE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",      label: "Edit Template",  icon: Pencil,      color: "#3b82f6" },
      { id: "preview",   label: "Preview",        icon: Eye,         color: "#8b5cf6" },
      { id: "activate",  label: "Activate",       icon: CheckCircle, color: "#22c55e" },
      { id: "duplicate", label: "Duplicate",      icon: Copy,        color: "#6b7280" },
      { id: "download",  label: "Download",       icon: Download,    color: "#6b7280" },
      { id: "archive",   label: "Archive",        icon: Archive,     color: "#ef4444" },
    ],
    rows:      minutesTemplateRows,
    kpis,
    entryBtn:  "Create Minutes Template",
    searchPlaceholder: "Search minutes templates",
  };

  return <GenPage cfg={cfg} />;
}

export function DocumentTemplatesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Templates",  value: String(docTemplateRows.length),                                          tone: "primary"  },
    { label: "Active",           value: String(docTemplateRows.filter(r => r.status === "Active").length),       tone: "success"  },
    { label: "Draft",            value: String(docTemplateRows.filter(r => r.status === "Draft").length),        tone: "neutral"  },
    { label: "Inactive",         value: String(docTemplateRows.filter(r => r.status === "Inactive").length),     tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Document Templates",
    desc:  "Manage document templates for board papers, meeting notices, attendance registers, and other governance forms.",
    cols: [
      fc("template_id",   "Template ID"),
      fc("template_name", "Template Name"),
      fc("category",      "Category"),
      fc("file_format",   "Format"),
      fc("language",      "Language"),
      fc("version",       "Version"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "template_name",
      identifier: "template_id",
      meta:       ["category", "file_format", "language"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Document Template Details",
    drawerCols:   DOC_TEMPLATE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",      label: "Edit Template",  icon: Pencil,      color: "#3b82f6" },
      { id: "preview",   label: "Preview",        icon: Eye,         color: "#8b5cf6" },
      { id: "activate",  label: "Activate",       icon: CheckCircle, color: "#22c55e" },
      { id: "duplicate", label: "Duplicate",      icon: Copy,        color: "#6b7280" },
      { id: "download",  label: "Download",       icon: Download,    color: "#6b7280" },
      { id: "archive",   label: "Archive",        icon: Archive,     color: "#ef4444" },
    ],
    rows:      docTemplateRows,
    kpis,
    entryBtn:  "Create Document Template",
    searchPlaceholder: "Search document templates",
  };

  return <GenPage cfg={cfg} />;
}

export function CommunicationTemplatesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Templates",  value: String(commTemplateRows.length),                                          tone: "primary"  },
    { label: "Active",           value: String(commTemplateRows.filter(r => r.status === "Active").length),       tone: "success"  },
    { label: "Email",            value: String(commTemplateRows.filter(r => r.channel === "Email").length),       tone: "neutral"  },
    { label: "Notification",     value: String(commTemplateRows.filter(r => r.channel === "System Notification").length), tone: "primary" },
  ];

  const cfg: PageCfg = {
    title: "Communication Templates",
    desc:  "Manage email, SMS, and notification templates used for meeting invitations, reminders, and governance alerts.",
    cols: [
      fc("template_id",   "Template ID"),
      fc("template_name", "Template Name"),
      fc("channel",       "Channel"),
      fc("trigger_event", "Trigger Event"),
      fc("language",      "Language"),
      fc("version",       "Version"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "template_name",
      identifier: "template_id",
      meta:       ["channel", "trigger_event", "language"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Communication Template Details",
    drawerCols:   COMM_TEMPLATE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Template",   icon: Pencil,      color: "#3b82f6" },
      { id: "preview",    label: "Preview",         icon: Eye,         color: "#8b5cf6" },
      { id: "test_send",  label: "Send Test",       icon: Send,        color: "#22c55e" },
      { id: "activate",   label: "Activate",        icon: CheckCircle, color: "#22c55e" },
      { id: "duplicate",  label: "Duplicate",       icon: Copy,        color: "#6b7280" },
      { id: "archive",    label: "Archive",         icon: Archive,     color: "#ef4444" },
    ],
    rows:      commTemplateRows,
    kpis,
    entryBtn:  "Create Communication Template",
    searchPlaceholder: "Search communication templates",
  };

  return <GenPage cfg={cfg} />;
}
