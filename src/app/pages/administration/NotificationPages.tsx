/**
 * Notification administration pages:
 *  - NotificationRulesPage
 *  - MessageTemplatesPage
 *  - DeliveryLogsPage
 */
import {
  Bell, MessageSquare, Mail, Smartphone, Monitor,
  CheckCircle, XCircle, Pencil, Pause, Copy, Archive, Download,
  AlertTriangle, RefreshCw,
} from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow, KpiDef, ColDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, gen, CIRCLES_DATA, NAMES, dg } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";

// ─── Local sample data ────────────────────────────────────────────────────────

const TRIGGER_EVENTS = [
  "Meeting Scheduled", "Meeting Reminder (24h)", "Meeting Reminder (1h)",
  "RSVP Deadline Approaching", "Agenda Published", "Board Pack Released",
  "Minutes Available", "Action Item Due", "Quorum Not Met",
  "Approval Required", "Resolution Passed", "Meeting Cancelled",
];

const CHANNELS = ["Email", "SMS", "System Notification", "Portal Alert"];
const AUDIENCES = ["All Participants", "Quorum Members", "Board Directors", "Company Secretary", "Meeting Organizer"];
const RULE_STATUSES = ["Active", "Inactive", "Draft"];

const notifRuleRows: TableRow[] = gen(22, i => ({
  rule_id:       `NR-${String(1000 + i).padStart(4, "0")}`,
  rule_name:     `${TRIGGER_EVENTS[i % 12]} Notification`,
  trigger_event: TRIGGER_EVENTS[i % 12],
  channel:       CHANNELS[i % 4],
  audience:      AUDIENCES[i % 5],
  committee:     CIRCLES_DATA[i % 8],
  delay_minutes: String([0, 5, 15, 30, 60, 1440][i % 6]),
  template:      `${CHANNELS[i % 4]} Template ${i % 5 + 1}`,
  status:        RULE_STATUSES[i % 3],
  created_by:    ["Company Secretary", "System Admin"][i % 2],
  created_at:    `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  description:   `Sends ${CHANNELS[i % 4].toLowerCase()} when ${TRIGGER_EVENTS[i % 12].toLowerCase()}.`,
}));

const MSG_TEMPLATE_NAMES = [
  "Meeting Invitation", "Meeting Reminder", "RSVP Request",
  "Agenda Available", "Board Pack Ready", "Minutes Published",
  "Action Item Alert", "Approval Request", "Quorum Warning",
  "Meeting Cancelled", "Resolution Passed", "Deadline Alert",
];

const msgTemplateRows: TableRow[] = gen(24, i => ({
  template_id:   `MT-${String(5000 + i).padStart(4, "0")}`,
  template_name: MSG_TEMPLATE_NAMES[i % 12],
  channel:       CHANNELS[i % 4],
  subject:       `[BMS] ${MSG_TEMPLATE_NAMES[i % 12]} - {Meeting Title}`,
  language:      ["English", "Bengali", "Both"][i % 3],
  committee:     CIRCLES_DATA[i % 8],
  version:       `v${(i % 3) + 1}.0`,
  variables:     ["{Name}", "{Date}", "{Venue}", "{Link}"].slice(0, (i % 4) + 1).join(", "),
  status:        RULE_STATUSES[i % 3],
  created_by:    ["Company Secretary", "System Admin"][i % 2],
  created_at:    `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
}));

const DELIVERY_STATUSES = ["Delivered", "Sent", "Failed", "Pending", "Bounced", "Skipped"];
const RECIPIENT_NAMES = [
  "Mr. Abdul Awal Mintoo", "Mr. Md. Nurul Amin", "Ms. Nasrin Sultana",
  "Mr. Kamal Hossain", "Mr. Rafiqul Islam", "Ms. Fatema Begum",
  "Mr. Imran Hossain", "Dr. Aminul Haque",
];

const deliveryLogRows: TableRow[] = gen(40, i => ({
  log_id:        `DL-${String(6000 + i).padStart(5, "0")}`,
  rule_name:     `${TRIGGER_EVENTS[i % 12]} Notification`,
  template_name: MSG_TEMPLATE_NAMES[i % 12],
  channel:       CHANNELS[i % 4],
  recipient:     RECIPIENT_NAMES[i % 8],
  subject:       `[BMS] ${MSG_TEMPLATE_NAMES[i % 12]} - ${NAMES[i % 10]}`,
  sent_at:       `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")} ${String(8 + (i % 10)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
  delivered_at:  DELIVERY_STATUSES[i % 6] === "Delivered"
    ? `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")} ${String(8 + (i % 10)).padStart(2, "0")}:${String((i * 7 + 2) % 60).padStart(2, "0")}`
    : "—",
  committee:     CIRCLES_DATA[i % 8],
  retry_count:   String(DELIVERY_STATUSES[i % 6] === "Failed" ? (i % 3) + 1 : 0),
  error_message: DELIVERY_STATUSES[i % 6] === "Failed"
    ? ["Mailbox full", "Invalid address", "Connection timeout"][i % 3]
    : "—",
  status:        DELIVERY_STATUSES[i % 6],
  approval_status: DELIVERY_STATUSES[i % 6],
}));

// ─── Drawer schemas ───────────────────────────────────────────────────────────

const NOTIF_RULE_DRAWER_COLS: ColDef[] = [
  dg("Rule Configuration", [
    { key: "rule_id",       label: "Rule ID" },
    { key: "rule_name",     label: "Rule Name" },
    { key: "trigger_event", label: "Trigger Event" },
    { key: "status",        label: "Status", badge: true },
    { key: "description",   label: "Description" },
  ]),
  dg("Delivery Settings", [
    { key: "channel",       label: "Channel" },
    { key: "audience",      label: "Audience" },
    { key: "template",      label: "Message Template" },
    { key: "delay_minutes", label: "Delay (minutes)" },
    { key: "committee",     label: "Governance Body" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

const MSG_TEMPLATE_DRAWER_COLS: ColDef[] = [
  dg("Template", [
    { key: "template_id",   label: "Template ID" },
    { key: "template_name", label: "Template Name" },
    { key: "channel",       label: "Channel" },
    { key: "language",      label: "Language" },
    { key: "status",        label: "Status", badge: true },
  ]),
  dg("Content", [
    { key: "subject",   label: "Subject" },
    { key: "variables", label: "Template Variables" },
    { key: "committee", label: "Governance Body" },
  ]),
  dg("Version & Authorship", [
    { key: "version",    label: "Version" },
    { key: "created_by", label: "Created By" },
    { key: "created_at", label: "Created At" },
  ]),
];

const DELIVERY_LOG_DRAWER_COLS: ColDef[] = [
  dg("Delivery Event", [
    { key: "log_id",        label: "Log ID" },
    { key: "rule_name",     label: "Notification Rule" },
    { key: "template_name", label: "Template Used" },
    { key: "channel",       label: "Channel" },
    { key: "status",        label: "Delivery Status", badge: true },
  ]),
  dg("Recipient", [
    { key: "recipient",  label: "Recipient" },
    { key: "subject",    label: "Subject" },
    { key: "committee",  label: "Governance Body" },
  ]),
  dg("Delivery Timeline", [
    { key: "sent_at",       label: "Sent At" },
    { key: "delivered_at",  label: "Delivered At" },
    { key: "retry_count",   label: "Retry Count" },
    { key: "error_message", label: "Error Detail" },
  ]),
];

// ─── Pages ────────────────────────────────────────────────────────────────────

export function NotificationRulesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Rules",  value: String(notifRuleRows.length),                                              tone: "primary"  },
    { label: "Active",       value: String(notifRuleRows.filter(r => r.status === "Active").length),           tone: "success"  },
    { label: "Draft",        value: String(notifRuleRows.filter(r => r.status === "Draft").length),            tone: "neutral"  },
    { label: "Inactive",     value: String(notifRuleRows.filter(r => r.status === "Inactive").length),         tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Notification Rules",
    desc:  "Configure automated notification rules that trigger communications based on meeting and governance events.",
    cols: [
      fc("rule_id",       "Rule ID"),
      fc("rule_name",     "Rule Name"),
      fc("trigger_event", "Trigger Event"),
      fc("channel",       "Channel"),
      fc("audience",      "Audience"),
      fc("delay_minutes", "Delay (min)"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "rule_name",
      identifier: "rule_id",
      meta:       ["trigger_event", "channel", "audience"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Notification Rule Details",
    drawerCols:   NOTIF_RULE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Rule",    icon: Pencil,      color: "#3b82f6" },
      { id: "activate",   label: "Activate",     icon: CheckCircle, color: "#22c55e" },
      { id: "deactivate", label: "Deactivate",   icon: Pause,       color: "#f59e0b" },
      { id: "duplicate",  label: "Duplicate",    icon: Copy,        color: "#8b5cf6" },
      { id: "archive",    label: "Archive",      icon: Archive,     color: "#ef4444" },
    ],
    rows:      notifRuleRows,
    kpis,
    entryBtn:  "Create Notification Rule",
    searchPlaceholder: "Search notification rules",
  };

  return <GenPage cfg={cfg} />;
}

export function MessageTemplatesPage() {
  const kpis: KpiDef[] = [
    { label: "Total Templates",  value: String(msgTemplateRows.length),                                           tone: "primary"  },
    { label: "Active",           value: String(msgTemplateRows.filter(r => r.status === "Active").length),        tone: "success"  },
    { label: "Email",            value: String(msgTemplateRows.filter(r => r.channel === "Email").length),        tone: "neutral"  },
    { label: "Notification",     value: String(msgTemplateRows.filter(r => r.channel === "System Notification").length), tone: "primary" },
  ];

  const cfg: PageCfg = {
    title: "Message Templates",
    desc:  "Manage message content templates for email, SMS, and system notifications sent throughout the governance lifecycle.",
    cols: [
      fc("template_id",   "Template ID"),
      fc("template_name", "Template Name"),
      fc("channel",       "Channel"),
      fc("subject",       "Subject"),
      fc("language",      "Language"),
      fc("version",       "Version"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "template_name",
      identifier: "template_id",
      meta:       ["channel", "language", "version"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Message Template Details",
    drawerCols:   MSG_TEMPLATE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",      label: "Edit Template",  icon: Pencil,      color: "#3b82f6" },
      { id: "preview",   label: "Preview",        icon: MessageSquare, color: "#8b5cf6" },
      { id: "activate",  label: "Activate",       icon: CheckCircle, color: "#22c55e" },
      { id: "duplicate", label: "Duplicate",      icon: Copy,        color: "#6b7280" },
      { id: "archive",   label: "Archive",        icon: Archive,     color: "#ef4444" },
    ],
    rows:      msgTemplateRows,
    kpis,
    entryBtn:  "Create Message Template",
    searchPlaceholder: "Search message templates",
  };

  return <GenPage cfg={cfg} />;
}

export function DeliveryLogsPage() {
  const delivered  = deliveryLogRows.filter(r => r.status === "Delivered").length;
  const failed     = deliveryLogRows.filter(r => r.status === "Failed").length;
  const pending    = deliveryLogRows.filter(r => r.status === "Pending").length;

  const kpis: KpiDef[] = [
    { label: "Total Sent",   value: String(deliveryLogRows.length),   tone: "primary"  },
    { label: "Delivered",    value: String(delivered),                tone: "success"  },
    { label: "Failed",       value: String(failed),                   tone: "error"    },
    { label: "Pending",      value: String(pending),                  tone: "warning"  },
    { label: "Delivery Rate", value: `${Math.round((delivered / deliveryLogRows.length) * 100)}%`, tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Delivery Logs",
    desc:  "Audit log of all notification deliveries, failures, and retries across all communication channels.",
    cols: [
      fc("log_id",        "Log ID"),
      fc("rule_name",     "Notification Rule"),
      fc("channel",       "Channel"),
      fc("recipient",     "Recipient"),
      fc("sent_at",       "Sent At"),
      fc("delivered_at",  "Delivered At"),
      fc("retry_count",   "Retries"),
      BADGE("status",     "Status"),
    ],
    mobileCardMapping: {
      primary:    "recipient",
      identifier: "log_id",
      meta:       ["rule_name", "channel", "sent_at"],
      status:     "status",
      date:       "sent_at",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Delivery Log Details",
    drawerCols:   DELIVERY_LOG_DRAWER_COLS,
    drawerActions: [
      { id: "retry",     label: "Retry Delivery",  icon: RefreshCw,   color: "#3b82f6" },
      { id: "download",  label: "Export Log",      icon: Download,    color: "#6b7280" },
    ],
    rows:      deliveryLogRows,
    kpis,
    searchPlaceholder: "Search delivery logs",
  };

  return <GenPage cfg={cfg} />;
}
