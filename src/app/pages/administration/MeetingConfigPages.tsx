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
  QUORUM_RULE_DRAWER_COLS,
  VOTING_METHOD_DRAWER_COLS,
} from "../boardMeetingDrawerSchemas";
import { dg } from "../modulePageUtils";
import type { ColDef } from "../modulePageUtils";
import {
  useQuorumRuleRegistry,
  useVotingMethodRegistry,
} from "../../data/boardMeetingData";
import { unverifiedMeetingTypesView } from "./meetingTypesEvidence";
import { unverifiedQuorumRulesView } from "./quorumRulesEvidence";
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
  const registry = useQuorumRuleRegistry();
  const evidence = unverifiedQuorumRulesView();

  const cfg: PageCfg = {
    title: "Quorum Rules",
    desc:  evidence.description,
    cols: [
      fc("agenda_no",             "Rule ID"),
      fc("governance_body_name",  "Governance Body"),
      fc("quorum_type",           "Quorum Type"),
      fc("minimum_members",       "Min. Members"),
      fc("quorum_percent",        "Min. Percentage"),
      fc("meeting_type",          "Meeting Type"),
      BADGE("approval_status",    "Status"),
    ],
    mobileCardMapping: {
      primary:    "governance_body_name",
      identifier: "agenda_no",
      meta:       ["quorum_type", "minimum_members", "meeting_type"],
      status:     "approval_status",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerTitle:  "Quorum Rule Details",
    drawerCols:   QUORUM_RULE_DRAWER_COLS,
    drawerActions: [
      { id: "edit",       label: "Edit Rule",    icon: Pencil,      color: "#3b82f6" },
      { id: "activate",   label: "Activate",     icon: CheckCircle, color: "#22c55e" },
      { id: "deactivate", label: "Deactivate",   icon: Pause,       color: "#f59e0b" },
      { id: "download",   label: "Export",       icon: Download,    color: "#6b7280" },
    ],
    rows:      evidence.rows,
    dataLoading: registry.loading,
    dataError: registry.error ?? (registry.loading ? null : evidence.unavailableReason),
    dataErrorTitle: "Quorum rule configuration is unavailable",
    dataErrorDescription: evidence.description,
    onDataRetry: registry.refresh,
    entryBtn:  "Create Quorum Rule",
    searchPlaceholder: "Search quorum rules",
  };

  return <GenPage cfg={cfg} />;
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
