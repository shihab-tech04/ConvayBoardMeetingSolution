/**
 * Meeting Configuration pages:
 *  - MeetingTypesPage
 *  - QuorumRulesPage
 *  - VotingMethodsPage
 *  - StatusesNumberingPage
 */
import {
  CalendarDays, Shield, Vote, Hash,
  CheckCircle, Pencil, Pause, Copy, Archive, Download,
} from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import {
  VOTING_METHOD_DRAWER_COLS,
} from "../boardMeetingDrawerSchemas";
import { dg } from "../modulePageUtils";
import type { ColDef } from "../modulePageUtils";
import {
  useQuorumRuleRegistry,
  useGovernanceRegistry, generateId,
  useVotingMethodRegistry,
} from "../../data/boardMeetingData";
import { unverifiedMeetingTypesView } from "./meetingTypesEvidence";
import { MeetingTemplateMarketplace } from "../subscribers/MeetingTemplateMarketplace";
import { convayAuth } from "../../services/supabase/convayAuth";
import { hasAccess, useAccessSnapshot } from "../../services/supabase/convayAccess";
import { activeMeetingGovernanceOptions } from "../return-register/meetingCreatePrerequisites";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { createVersionedQuorumRule, deactivateQuorumRule, type VersionedQuorumRule, type QuorumRuleGateway } from "./quorumRulePersistence";
import { unverifiedVotingMethodsView } from "./votingMethodsEvidence";
import { unverifiedStatusConfigurationView } from "./statusConfigurationEvidence";
import { unverifiedNumberingConfigurationView } from "./numberingConfigurationEvidence";

// ─── Status and numbering drawer schema ──────────────────────────────────────

const STATUS_NUMBERING_DRAWER_COLS: ColDef[] = [
  dg("Status Configuration", [
    { key: "config_id",    label: "Config ID" },
    { key: "status_name",  label: "Status Name" },
    { key: "entity_type",  label: "Entity Type" },
    { key: "color_code",   label: "Color Code" },
    { key: "is_terminal",  label: "Terminal State" },
    { key: "sort_order",   label: "Display Order" },
    { key: "status",       label: "Configuration Status", badge: true },
  ]),
  dg("Numbering Scheme", [
    { key: "prefix",        label: "Reference Prefix" },
    { key: "sequence_from", label: "Sequence Starts At" },
    { key: "format",        label: "Format Pattern" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
    { key: "description", label: "Description" },
  ]),
];

const MEETING_TYPE_DRAWER_COLS: ColDef[] = [
  dg("Meeting Type", [
    { key: "type_id",      label: "Type ID" },
    { key: "type_name",    label: "Type Name" },
    { key: "category",     label: "Category" },
    { key: "status",       label: "Status", badge: true },
    { key: "description",  label: "Description" },
  ]),
  dg("Governance", [
    { key: "committee",     label: "Default Committee" },
    { key: "frequency",     label: "Frequency" },
    { key: "notice_days",   label: "Notice Period (days)" },
    { key: "quorum_rule",   label: "Default Quorum Rule" },
    { key: "voting_method", label: "Default Voting Method" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Pages ────────────────────────────────────────────────────────────────────

export function MeetingTypesPage() {
  // The platform-controlled versioned template registry is live in SQL.
  // Keep the existing fail-closed view for roles that cannot administer the
  // platform-wide marketplace. Neither route enables meeting-template runtime.
  const access = useAccessSnapshot();
  if (access.loaded && access.is_super_admin) {
    return (
      <main className="p-6" aria-label="Meeting type configuration">
        <h1 className="text-2xl font-semibold mb-2">Meeting Types</h1>
        <p className="mb-5 text-sm text-[var(--text-secondary,#64748b)]">
          Configure and publish versioned meeting types in Supabase SQL. Published
          templates are not yet enabled in the meeting creation wizard, and no
          company workspace is activated by editing them.
        </p>
        <MeetingTemplateMarketplace />
      </main>
    );
  }
  const evidence = unverifiedMeetingTypesView();

  const cfg: PageCfg = {
    title: "Meeting Types",
    desc:  evidence.description,
    dataError: evidence.unavailableReason,
    dataErrorTitle: "Meeting type configuration is unavailable",
    dataErrorDescription: evidence.unavailableReason,
    cols: [
      fc("type_id",      "Type ID"),
      fc("type_name",    "Meeting Type"),
      fc("category",     "Category"),
      fc("committee",    "Default Body"),
      fc("frequency",    "Frequency"),
      fc("notice_days",  "Notice Days"),
      BADGE("status",    "Status"),
    ],
    mobileCardMapping: {
      primary:    "type_name",
      identifier: "type_id",
      meta:       ["category", "committee", "frequency"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Meeting Type Details",
    drawerCols:   MEETING_TYPE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Type",    icon: Pencil,      color: "#3b82f6" },
      { id: "activate",   label: "Activate",     icon: CheckCircle, color: "#22c55e" },
      { id: "deactivate", label: "Deactivate",   icon: Pause,       color: "#f59e0b" },
      { id: "duplicate",  label: "Duplicate",    icon: Copy,        color: "#8b5cf6" },
      { id: "archive",    label: "Archive",      icon: Archive,     color: "#ef4444" },
    ],
    rows:      evidence.rows,
    entryBtn:  "Create Meeting Type",
    searchPlaceholder: "Search meeting types",
  };

  return <GenPage cfg={cfg} />;
}

export function QuorumRulesPage() {
  const access = useAccessSnapshot();
  const canManageQuorum = hasAccess("admin_config", access);
  const registry = useQuorumRuleRegistry();
  const governance = useGovernanceRegistry();
  const [confirmDeactivation, setConfirmDeactivation] = useState<string | null>(null);
  const pendingCreate = useRef<{ signature: string; id: string; created_at: string } | null>(null);
  const gateway: QuorumRuleGateway = {
    list: async () => (await convayAuth.registry<VersionedQuorumRule>("bms.quorumrules", "list")).records.map(r => r.payload),
    create: async rule => await registry.add(rule),
    update: async (id, patch) => await registry.update(id, patch),
  };
  const bodies = activeMeetingGovernanceOptions(governance.items);
  const fields = [
    { key: "rule_name", label: "Rule Name", type: "text", required: true, span: true },
    { key: "governance_body_id", label: "Board / Committee", type: "select", required: true, options: bodies },
    { key: "rule_type", label: "Quorum Type", type: "select", required: true,
      options: [{ value: "percentage", label: "Percentage" }, { value: "fixed_number", label: "Fixed Number" }], defaultValue: "percentage" },
    { key: "minimum_members_count", label: "Minimum Members", type: "number", defaultValue: "0", placeholder: "0" },
    { key: "minimum_percentage", label: "Minimum Percentage (%)", type: "number", defaultValue: "50", placeholder: "50" },
    { key: "count_virtual_attendance", label: "Count Virtual Attendance", type: "toggle", defaultValue: true },
    { key: "count_alternate_members", label: "Count Alternate Members", type: "toggle", defaultValue: false },
    { key: "exclude_recused_members", label: "Exclude Recused Members", type: "toggle", defaultValue: true },
  ];
  const rows = registry.items.map(rule => ({ ...rule, id: rule.id }));
  const cfg: PageCfg = {
    title: "Quorum Rules",
    desc: "Manage versioned quorum policies for verified governance bodies. Changes require administrator authorization and independent SQL readback.",
    cols: [
      fc("rule_id", "Rule ID"),
      fc("body_name", "Governance Body"),
      fc("rule_type", "Quorum Type"),
      fc("minimum_members", "Min. Members"),
      fc("quorum_percent", "Min. Percentage"),
      fc("policy_version", "Version"),
      BADGE("status", "Status"),
    ],
    mobileCardMapping: {
      primary: "body_name", identifier: "rule_id", meta: ["rule_type", "minimum_members", "quorum_percent"], status: "status",
    },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerTitle: "Quorum Rule Details",
    drawerCols: [
      dg("Policy", [
        { key: "rule_name", label: "Rule Name" },
        { key: "rule_id", label: "Rule ID" },
        { key: "body_name", label: "Governance Body" },
        { key: "rule_type", label: "Quorum Type" },
        { key: "policy_version", label: "Version" },
        { key: "status", label: "Status", badge: true },
      ]),
      dg("Thresholds", [
        { key: "minimum_members", label: "Minimum Members" },
        { key: "quorum_percent", label: "Percentage" },
        { key: "created_at", label: "Created At" },
      ]),
    ],
    drawerActionsResolver: row => canManageQuorum && String(row.status) === "Active"
      ? [{ id: "deactivate", label: "Deactivate Rule", icon: Pause, color: "#b45309" }]
      : [],
    onCustomAction: (action, row) => {
      if (action === "deactivate") setConfirmDeactivation(String(row.id ?? ""));
    },
    rows,
    formFields: fields,
    entryBtn: bodies.length > 0 && canManageQuorum ? "Create Quorum Rule" : undefined,
    awaitCreateSave: true,
    dataLoading: registry.loading || governance.loading,
    dataError: registry.error ?? governance.error,
    onDataRetry: async () => { await Promise.all([registry.refresh?.(), governance.refresh?.()]); },
    searchPlaceholder: "Search quorum policies",
    async onRowCreate(values) {
      const signature = JSON.stringify(values);
      if (!pendingCreate.current || pendingCreate.current.signature !== signature) {
        pendingCreate.current = {
          signature, id: generateId("QR", registry.items.map(rule => rule.rule_id)), created_at: new Date().toISOString(),
        };
      }
      await createVersionedQuorumRule(values, pendingCreate.current, governance.items, gateway);
      pendingCreate.current = null;
      await registry.refresh?.();
      return true;
    },
  };
  return (
    <>
      {bodies.length === 0 && !governance.loading && !governance.error && (
        <div role="status" className="mx-6 my-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          An active Board / Committee must exist before its quorum policy can be configured.
          <a className="font-semibold underline text-[var(--primary)]" href={`${import.meta.env.BASE_URL}governance-org/governance-bodies`}>
            Open Governance Bodies
          </a>
        </div>
      )}
      <GenPage cfg={cfg} />
      {confirmDeactivation && <SConfirmModal
        title="Deactivate quorum rule?"
        message="This is a versioned policy. Deactivation is denied while scheduled or active meetings rely on it; after deactivation you can create a new version."
        confirmLabel="Deactivate Rule"
        danger
        onClose={() => setConfirmDeactivation(null)}
        onConfirm={() => {
          const id = confirmDeactivation;
          setConfirmDeactivation(null);
          void deactivateQuorumRule(id, gateway)
            .then(async () => { await registry.refresh?.(); toast.success("Quorum rule deactivated. You can create a new version."); })
            .catch(err => toast.error(err instanceof Error ? err.message : "Could not deactivate the rule."));
        }}
      />}
    </>
  );
}

export function VotingMethodsPage() {
  const registry = useVotingMethodRegistry();
  const evidence = unverifiedVotingMethodsView();

  const cfg: PageCfg = {
    title: "Voting Methods",
    desc:  evidence.description,
    cols: [
      fc("method_id",      "Method ID"),
      fc("method_name",    "Voting Method"),
      fc("method_type",    "Type"),
      fc("majority_rule",  "Majority Rule"),
      fc("applicable_to",  "Applicable To"),
      fc("eligible_voters","Eligible Voters"),
      BADGE("status",      "Status"),
    ],
    mobileCardMapping: {
      primary:    "method_name",
      identifier: "method_id",
      meta:       ["method_type", "majority_rule", "applicable_to"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Voting Method Details",
    drawerCols:   VOTING_METHOD_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Method",  icon: Pencil,      color: "#3b82f6" },
      { id: "activate",   label: "Activate",     icon: CheckCircle, color: "#22c55e" },
      { id: "deactivate", label: "Deactivate",   icon: Pause,       color: "#f59e0b" },
      { id: "duplicate",  label: "Duplicate",    icon: Copy,        color: "#8b5cf6" },
      { id: "archive",    label: "Archive",      icon: Archive,     color: "#ef4444" },
    ],
    rows:      evidence.rows,
    dataLoading: registry.loading,
    dataError: registry.error ?? (registry.loading ? null : evidence.unavailableReason),
    dataErrorTitle: "Voting method configuration is unavailable",
    dataErrorDescription: evidence.description,
    onDataRetry: registry.refresh,
    entryBtn:  "Create Voting Method",
    searchPlaceholder: "Search voting methods",
  };

  return <GenPage cfg={cfg} />;
}

export function StatusesNumberingPage() {
  const evidence = unverifiedStatusConfigurationView();
  const numbering = unverifiedNumberingConfigurationView();
  const unavailableReason = `${evidence.unavailableReason} ${numbering.unavailableReason}`;

  const cfg: PageCfg = {
    title: "Statuses & Numbering",
    desc:  `${evidence.description} ${numbering.description}`,
    cols: [
      fc("config_id",    "Config ID"),
      fc("entity_type",  "Entity Type"),
      fc("status_name",  "Status Name"),
      fc("prefix",       "Number Prefix"),
      fc("format",       "Number Format"),
      fc("sort_order",   "Order"),
      BADGE("status",    "Active"),
    ],
    mobileCardMapping: {
      primary:    "status_name",
      identifier: "config_id",
      meta:       ["entity_type", "prefix", "format"],
      status:     "status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Status & Numbering Config",
    drawerCols:   STATUS_NUMBERING_DRAWER_COLS,
    drawerActions: [
      { id: "edit",    label: "Edit Config",   icon: Pencil,      color: "#3b82f6" },
      { id: "toggle",  label: "Toggle Active", icon: CheckCircle, color: "#22c55e" },
      { id: "archive", label: "Archive",       icon: Archive,     color: "#ef4444" },
    ],
    rows:      evidence.rows,
    dataError: unavailableReason,
    dataErrorTitle: "Status and numbering configuration are unavailable",
    dataErrorDescription: unavailableReason,
    entryBtn:  "Add Status Config",
    searchPlaceholder: "Search statuses and numbering",
  };

  return <GenPage cfg={cfg} />;
}
