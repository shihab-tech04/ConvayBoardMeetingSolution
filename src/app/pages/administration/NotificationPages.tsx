/**
 * Notification administration pages:
 *  - NotificationRulesPage
 *  - MessageTemplatesPage
 *  - DeliveryLogsPage
 */
import { useRef } from "react";
import {
  Bell, MessageSquare, Mail, Smartphone, Monitor,
  CheckCircle, XCircle, Pencil, Pause, Copy, Archive, Download,
  AlertTriangle, RefreshCw,
} from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow, KpiDef, ColDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, dg } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { useNotificationRuleRegistry, type NotificationRule } from "../../data/boardMeetingData";
import { hasAccess, readAccessSnapshot, useAccessSnapshot } from "../../services/supabase/convayAccess";
import type { FormField } from "../../components/forms/EntryForm";
import { toast } from "sonner";

// ─── Local sample data ────────────────────────────────────────────────────────


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

/**
 * NI-01 registry integration. The existing bms.notifyrules generic registry has
 * an admin_notifications SQL permission mapping; no new shared RLS/table is made
 * by this page. Only Draft rules can be created until server-confirmed delivery
 * activation and event dispatch are implemented. No fake delivery claims.
 */
const RULE_FORM_FIELDS: FormField[] = [
  { key: "rule_name", label: "Rule Name", type: "text", required: true },
  { key: "trigger_event", label: "Trigger Event", type: "text", required: true },
  { key: "channels", label: "Channel", type: "text", required: true },
  { key: "recipients", label: "Audience", type: "text", required: true },
  { key: "timing", label: "Delay / Timing", type: "text", required: true },
  { key: "template", label: "Template", type: "text", required: true },
  { key: "entity_type", label: "Event Entity Type", type: "text", required: true },
];

const RULE_FIELDS = [
  "rule_name", "trigger_event", "channels", "recipients", "timing", "template", "entity_type",
] as const;
type RuleValues = Pick<NotificationRule, (typeof RULE_FIELDS)[number]>;

function validateRuleValues(input: Record<string, unknown>): RuleValues {
  const result = {} as RuleValues;
  for (const key of RULE_FIELDS) {
    const value = input[key];
    if (typeof value !== "string" || !value.trim() || value.trim().length > 180) {
      throw new Error("Enter a valid " + key.replace(/_/g, " ") + " (maximum 180 characters).");
    }
    result[key] = value.trim();
  }
  return result;
}

async function confirmNotificationRule(
  registry: ReturnType<typeof useNotificationRuleRegistry>,
  id: string,
  values: RuleValues,
  expectedStatus: NotificationRule["status"],
  expectedRuleId: string,
  isCurrent: () => boolean,
): Promise<boolean> {
  // A transport ACK alone must not be presented as a verified saved rule.
  if (!registry.refresh || !isCurrent()) return false;
  await registry.refresh();
  if (!isCurrent()) return false;
  const authoritative = registry.getById(id);
  return Boolean(
    authoritative && authoritative.id === id &&
    authoritative.status === expectedStatus &&
    authoritative.rule_id === expectedRuleId &&
    RULE_FIELDS.every(field => authoritative[field] === values[field]),
  );
}

export function NotificationRulesPage() {
  const registry = useNotificationRuleRegistry();
  const access = useAccessSnapshot();
  const canManage = access.loaded && access.is_super_admin && hasAccess("admin_notifications", access);
  // A stale or denied read cannot authorize changes from an already-open drawer.
  const canEditDraft = canManage && !registry.loading && !registry.error;
  const isCurrent = () => readAccessSnapshot() === access && canManage;
  // Retain the original UUID after an ambiguous acknowledgement/readback.
  // A retry must recover that exact row or submit the same identity, never fork it.
  const pendingCreate = useRef<{ access: typeof access; record: NotificationRule } | null>(null);
  const rows: TableRow[] = (canManage ? registry.items : []).map(rule => ({
    ...rule,
    channel: rule.channels,
    audience: rule.recipients,
    delay_minutes: rule.timing,
    committee: "",
  }));
  const kpis: KpiDef[] = [
    { label: "Total Rules", value: String(rows.length), tone: "primary" },
    { label: "Active", value: String(rows.filter(row => row.status === "Active").length), tone: "success" },
    { label: "Draft", value: String(rows.filter(row => row.status === "Draft").length), tone: "neutral" },
    { label: "Inactive", value: String(rows.filter(row => row.status === "Inactive").length), tone: "warning" },
  ];
  const unavailable = "Delivery activation needs a verified event transport, policy and provider acknowledgement.";
  const cfg: PageCfg = {
    title: "Notification Rules",
    desc: "Review server-backed notification rules. Draft rules are persisted in Convay; activation and actual message delivery remain unverified.",
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
      primary: "rule_name",
      identifier: "rule_id",
      meta: ["trigger_event", "channel", "audience"],
      status: "status",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Notification Rule Details",
    drawerCols: NOTIF_RULE_DRAWER_COLS,
    drawerActionsResolver(row) {
      const editAllowed = canEditDraft && (row.status === "Draft" || row.status === "Inactive");
      return [
        { id: "edit", label: "Edit Rule", icon: Pencil, color: "#3b82f6",
          enabled: editAllowed, disabledReason: editAllowed ? undefined :
            "You need admin_notifications permission, and active rules must first be safely deactivated." },
        { id: "activate", label: "Activate", icon: CheckCircle, color: "#22c55e",
          enabled: false, disabledReason: unavailable },
        { id: "deactivate", label: "Deactivate", icon: Pause, color: "#f59e0b",
          enabled: false, disabledReason: unavailable },
        { id: "duplicate", label: "Duplicate", icon: Copy, color: "#8b5cf6",
          enabled: canEditDraft, disabledReason: "A verified rule read and admin_notifications permission are required." },
        { id: "archive", label: "Archive", icon: Archive, color: "#ef4444",
          enabled: false, disabledReason: "Archiving requires approved server-side rule lifecycle and audit policy." },
      ];
    },
    rows,
    dataLoading: registry.loading,
    dataError: registry.error,
    onDataRetry: registry.refresh,
    kpis,
    entryBtn: canEditDraft ? "Create Notification Rule" : undefined,
    formFields: RULE_FORM_FIELDS,
    awaitCreateSave: true,
    async onRowCreate(values) {
      if (!canEditDraft || !isCurrent()) return false;
      const normalized = validateRuleValues(values);
      let pending = pendingCreate.current;
      if (pending && pending.access !== access) {
        throw new Error("Access changed during the previous save. Reopen Notification Rules and verify the saved record before creating another.");
      }
      if (pending && !RULE_FIELDS.every(field => pending!.record[field] === normalized[field])) {
        throw new Error("A previous draft save is unconfirmed. Retry the original values or reopen the saved rule before starting another.");
      }
      if (!pending) {
        const id = crypto.randomUUID();
        pending = { access, record: {
          id, rule_id: "NR-" + id.slice(0, 8).toUpperCase(),
          ...normalized, status: "Draft", created_at: "",
        } };
        pendingCreate.current = pending;
      } else {
        if (!registry.refresh) return false;
        await registry.refresh();
        if (!isCurrent()) return false;
        const existing = registry.getById(pending.record.id);
        if (existing) {
          if (existing.status !== "Draft" || existing.rule_id !== pending.record.rule_id ||
              !RULE_FIELDS.every(field => existing[field] === normalized[field])) {
            throw new Error("The saved draft differs from the requested values. Reopen the authoritative record before editing.");
          }
          pendingCreate.current = null;
          return true;
        }
      }
      if (!isCurrent()) return false;
      const created = pending.record;
      const saved = await registry.add(created);
      if (!saved || !isCurrent()) return false;
      const confirmed = await confirmNotificationRule(registry, created.id, normalized, "Draft", created.rule_id, isCurrent);
      if (confirmed) pendingCreate.current = null;
      return confirmed;
    },
    async onRowUpdate(id, values) {
      if (!canEditDraft || !isCurrent()) return false;
      const current = registry.getById(id);
      if (!current || (current.status !== "Draft" && current.status !== "Inactive")) return false;
      const normalized = validateRuleValues(values);
      const saved = await registry.update(id, normalized);
      return saved && isCurrent() && await confirmNotificationRule(registry, id, normalized, current.status, current.rule_id, isCurrent);
    },
    searchPlaceholder: "Search notification rules",
  };
  return <GenPage cfg={cfg} />;
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
