/**
 * Notification administration pages:
 *  - NotificationRulesPage
 *  - MessageTemplatesPage
 *  - DeliveryLogsPage
 */
import {
  MessageSquare, CheckCircle, Pencil, Pause, Copy, Archive, Download, RefreshCw,
} from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow, KpiDef, ColDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, dg } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { toast } from "sonner";
import { useNotificationRuleRegistry } from "../../data/boardMeetingData";
import { hasAccess, readAccessSnapshot, useAccessSnapshot } from "../../services/supabase/convayAccess";

/**
 * NI-03 — Delivery logs must come from server-authoritative, provider-backed
 * audit events. The admin page has no verified delivery journal connection yet.
 * Do not show generated recipients, delivery timestamps, or success metrics.
 */
const deliveryLogRows: TableRow[] = [];

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
  const access = useAccessSnapshot();
  if (!access.loaded || !access.is_super_admin || !hasAccess("admin_notifications", access)) return null;
  return <NotificationRulesReadOnly />;
}

// NI-01: read real records only. Write controls remain gated until the
// independently reviewed server lifecycle and authorization migration is live.
function NotificationRulesReadOnly() {
  const access = useAccessSnapshot();
  const registry = useNotificationRuleRegistry();
  const readable = access.loaded && access.is_super_admin && hasAccess("admin_notifications", access) && !registry.loading && !registry.error;
  const rows: TableRow[] = readable ? registry.items.map(rule => ({
    ...rule, channel: rule.channels, audience: rule.recipients, delay_minutes: rule.timing,
  })) : [];
  const unavailable = "Notification rule changes require the verified server-side lifecycle and authorization policy.";
  const kpis: KpiDef[] = readable ? [
    { label: "Total Rules",  value: String(rows.length),                                              tone: "primary"  },
    { label: "Active",       value: String(rows.filter(r => r.status === "Active").length),           tone: "success"  },
    { label: "Draft",        value: String(rows.filter(r => r.status === "Draft").length),            tone: "neutral"  },
    { label: "Inactive",     value: String(rows.filter(r => r.status === "Inactive").length),         tone: "warning"  },
  ] : [{ label: "Rule evidence", value: "Unverified", tone: "warning" }];

  const cfg: PageCfg = {
    title: "Notification Rules",
    desc:  "Review server-backed notification rules. Rule creation, editing and activation require the verified server-side lifecycle; delivery remains unverified.",
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
      { id: "edit",       label: "Edit Rule",    icon: Pencil,      color: "#3b82f6", enabled: false, disabledReason: unavailable },
      { id: "activate",   label: "Activate",     icon: CheckCircle, color: "#22c55e", enabled: false, disabledReason: unavailable },
      { id: "deactivate", label: "Deactivate",   icon: Pause,       color: "#f59e0b", enabled: false, disabledReason: unavailable },
      { id: "duplicate",  label: "Duplicate",    icon: Copy,        color: "#8b5cf6", enabled: false, disabledReason: unavailable },
      { id: "archive",    label: "Archive",      icon: Archive,     color: "#ef4444", enabled: false, disabledReason: unavailable },
    ],
    rows,
    dataLoading: registry.loading,
    dataError: registry.error,
    dataErrorTitle: "Notification rules could not be loaded",
    onDataRetry: () => {
      if (readAccessSnapshot() === access && access.is_super_admin) void registry.refresh?.().catch(() => undefined);
    },
    kpis,
    entryBtn:  "Create Notification Rule",
    onEntryBtnClick: () => { toast.info(unavailable); },
    searchPlaceholder: "Search notification rules",
  };

  return <GenPage key={readable ? "verified-rules" : "unverified-rules"} cfg={cfg} />;
}

/**
 * NI-02: communication-template admin records require a distinct authenticated,
 * permission-scoped server registry. The existing bms.templates registry owns
 * MEETING templates; it must never be treated as notification message content.
 * Preserve the approved UI but do not show fabricated template rows or counts.
 */
export function MessageTemplatesPage() {
  const unavailable = "Message-template storage, approval policy and source-backed preview are not connected.";
  const cfg: PageCfg = {
    title: "Message Templates",
    desc: "Server-backed communication message templates are not connected yet. Template content, versions and provider eligibility are unverified; no generated templates are displayed.",
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
      primary: "template_name",
      identifier: "template_id",
      meta: ["channel", "language", "version"],
      status: "status",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Message Template Details",
    drawerCols: MSG_TEMPLATE_DRAWER_COLS,
    drawerActions: [
      { id: "edit", label: "Edit Template", icon: Pencil, color: "#3b82f6",
        enabled: false, disabledReason: unavailable },
      { id: "preview", label: "Preview", icon: MessageSquare, color: "#8b5cf6",
        enabled: false, disabledReason: "There is no authenticated saved message content to preview." },
      { id: "activate", label: "Activate", icon: CheckCircle, color: "#22c55e",
        enabled: false, disabledReason: unavailable },
      { id: "duplicate", label: "Duplicate", icon: Copy, color: "#6b7280",
        enabled: false, disabledReason: unavailable },
      { id: "archive", label: "Archive", icon: Archive, color: "#ef4444",
        enabled: false, disabledReason: unavailable },
    ],
    rows: [],
    kpis: [{ label: "Template evidence", value: "Unverified", tone: "warning" }],
    entryBtn: "Create Message Template",
    onEntryBtnClick: () => {
      toast.info("Message templates cannot be saved until the authenticated template registry is available.");
    },
    searchPlaceholder: "Search message templates",
  };
  return <GenPage cfg={cfg} />;
}

export function DeliveryLogsPage() {
  const kpis: KpiDef[] = [
    { label: "Delivery evidence", value: "Unverified", tone: "warning" },
  ];

  const cfg: PageCfg = {
    title: "Delivery Logs",
    desc:  "Provider-backed delivery logs are not connected. Delivery outcomes and retry records remain unverified; no simulated deliveries are shown.",
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
      { id: "retry",     label: "Retry Delivery",  icon: RefreshCw,   color: "#3b82f6", enabled: false, disabledReason: "No authenticated provider retry operation is configured." },
      { id: "download",  label: "Export Log",      icon: Download,    color: "#6b7280", enabled: false, disabledReason: "No verified delivery records are available to export." },
    ],
    rows:      deliveryLogRows,
    kpis,
    searchPlaceholder: "Search delivery logs",
  };

  return <GenPage cfg={cfg} />;
}
