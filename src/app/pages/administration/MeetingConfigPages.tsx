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
import type { PageCfg, TableRow, KpiDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, gen, CIRCLES_DATA } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import {
  QUORUM_RULE_DRAWER_COLS,
  VOTING_METHOD_DRAWER_COLS,
} from "../boardMeetingDrawerSchemas";
import { dg } from "../modulePageUtils";
import type { ColDef } from "../modulePageUtils";
import {
  useGovernanceRegistry,
  useQuorumRuleRegistry,
} from "../../data/boardMeetingData";

// ─── Local sample data ────────────────────────────────────────────────────────

const MEETING_TYPE_NAMES = [
  "Annual General Meeting", "Extraordinary General Meeting", "Board Meeting",
  "Executive Committee Meeting", "Audit Committee Meeting", "Risk Committee Meeting",
  "Shariah Committee Meeting", "Nomination & Remuneration Committee Meeting",
  "Special Board Session", "Emergency Board Meeting",
];

const meetingTypeRows: TableRow[] = gen(18, i => ({
  type_id:       `MT-${String(100 + i).padStart(3, "0")}`,
  type_name:     MEETING_TYPE_NAMES[i % 10],
  category:      ["Board", "Committee", "Special", "Emergency"][i % 4],
  committee:     CIRCLES_DATA[i % 8],
  frequency:     ["Monthly", "Quarterly", "Annual", "As Required"][i % 4],
  notice_days:   String([7, 14, 21, 3][i % 4]),
  quorum_rule:   ["50%+1", "Two-Thirds", "Majority", "Three-Quarters"][i % 4],
  voting_method: ["Simple Majority", "Consensus", "Show of Hands", "Secret Ballot"][i % 4],
  status:        ["Active", "Inactive", "Draft"][i % 3],
  created_by:    ["Company Secretary", "System Admin"][i % 2],
  created_at:    `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  description:   `Standard ${MEETING_TYPE_NAMES[i % 10]} procedures as per governance charter.`,
}));

const VOTING_METHOD_NAMES = [
  "Simple Majority", "Two-Thirds Majority", "Unanimous Consent",
  "Show of Hands", "Secret Ballot", "Written Resolution",
  "Casting Vote (Chairman)", "Proxy Voting", "Electronic Voting",
];

const votingMethodRows: TableRow[] = gen(16, i => ({
  method_id:      `VM-${String(200 + i).padStart(3, "0")}`,
  method_name:    VOTING_METHOD_NAMES[i % 9],
  method_type:    ["Simple", "Supermajority", "Consensus", "Proxy"][i % 4],
  majority_rule:  ["50%+1", "Two-Thirds", "Three-Quarters", "Unanimous"][i % 4],
  applicable_to:  ["All Meetings", "Board Meetings", "Committee Meetings", "AGM"][i % 4],
  eligible_voters: ["All Members", "Voting Members Only", "Board Directors"][i % 3],
  status:         ["Active", "Inactive", "Draft"][i % 3],
  committee:      CIRCLES_DATA[i % 8],
  created_by:     ["Company Secretary", "System Admin"][i % 2],
  created_at:     `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  particulars:    VOTING_METHOD_NAMES[i % 9],
  reference:      ["Simple", "Supermajority", "Consensus"][i % 3],
  name:           ["All Meetings", "Board Only", "Committees Only"][i % 3],
  debit:          ["50%+1", "Two-Thirds", "Unanimous"][i % 3],
  credit:         ["All Members", "Voting Members"][i % 2],
  balance:        ["Active", "Inactive", "Draft"][i % 3],
  transaction_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
}));

const STATUS_ENTITY_TYPES = ["Meeting", "Agenda", "Document", "Resolution", "Minutes", "Action Item"];
const STATUS_NAMES = [
  "Draft", "Submitted", "Under Review", "Pending Approval",
  "Approved", "Rejected", "In Progress", "Completed",
  "Archived", "Cancelled", "Published", "Signed",
];

const statusRows: TableRow[] = gen(24, i => ({
  config_id:    `SC-${String(300 + i).padStart(3, "0")}`,
  status_name:  STATUS_NAMES[i % 12],
  entity_type:  STATUS_ENTITY_TYPES[i % 6],
  color_code:   ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"][i % 6],
  is_terminal:  i % 5 === 0 ? "Yes" : "No",
  sort_order:   String(i + 1),
  prefix:       ["MTG", "AGD", "DOC", "RES", "MIN", "ACT"][i % 6],
  sequence_from: String(1000 + i * 100),
  format:       [`${["MTG", "AGD", "DOC", "RES"][i % 4]}-{YYYY}-{NNN}`, `{PREFIX}-{YY}-{NNNN}`][i % 2],
  status:       ["Active", "Inactive"][i % 2],
  created_by:   ["System Admin", "Company Secretary"][i % 2],
  created_at:   `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  description:  `${STATUS_NAMES[i % 12]} state for ${STATUS_ENTITY_TYPES[i % 6]} records.`,
}));

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
  const kpis: KpiDef[] = [
    { label: "Total Types",  value: String(meetingTypeRows.length),                                          tone: "primary"  },
    { label: "Active",       value: String(meetingTypeRows.filter(r => r.status === "Active").length),       tone: "success"  },
    { label: "Draft",        value: String(meetingTypeRows.filter(r => r.status === "Draft").length),        tone: "neutral"  },
    { label: "Inactive",     value: String(meetingTypeRows.filter(r => r.status === "Inactive").length),     tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Meeting Types",
    desc:  "Configure types of meetings, their default rules, notice periods, and governance settings.",
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
    rows:      meetingTypeRows,
    kpis,
    entryBtn:  "Create Meeting Type",
    searchPlaceholder: "Search meeting types",
  };

  return <GenPage cfg={cfg} />;
}

export function QuorumRulesPage() {
  const { items: quorumRules } = useQuorumRuleRegistry();
  const { items: govBodies }   = useGovernanceRegistry();

  const rows: TableRow[] = quorumRules.map(r => ({
    ...r,
    id:          r.id,
    governance_body_name: govBodies.find(g => g.id === r.governance_body_id || g.body_id === r.governance_body_id)?.body_name ?? r.governance_body_name ?? r.governance_body_id,
    name:        r.governance_body_name ?? r.governance_body_id,
    agenda_no:   `QR-${r.id?.padStart?.(4, "0") ?? r.id}`,
    agenda_date: r.quorum_type ?? "Percentage",
    meeting_type: r.meeting_type ?? "All",
    committee:    r.governance_body_name ?? "",
    approved_amount: String(r.minimum_members ?? "—"),
    disbursed_amount: r.quorum_percent ? `${r.quorum_percent}%` : "—",
    outstanding:  r.effective_date ?? "—",
    approval_status: (r as { status?: string }).status ?? "Active",
    status:      (r as { status?: string }).status ?? "Active",
  }));

  const fallbackRows: TableRow[] = gen(16, i => ({
    quorum_id:      `QR-${String(400 + i).padStart(4, "0")}`,
    governance_body_name: CIRCLES_DATA[i % 8],
    quorum_type:    ["Percentage", "Fixed Count", "Role-Based"][i % 3],
    minimum_members: String([3, 4, 5, 6, 7][i % 5]),
    quorum_percent:  `${[50, 60, 67, 75][i % 4]}%`,
    meeting_type:    ["All Meetings", "Regular", "Extraordinary"][i % 3],
    required_roles:  ["Chairperson", "Chairperson + Secretary", "Any Voting Member"][i % 3],
    effective_date:  `2024-0${(i % 9) + 1}-01`,
    status:         ["Active", "Inactive", "Draft"][i % 3],
    committee:      CIRCLES_DATA[i % 8],
    agenda_no:      `QR-${String(400 + i).padStart(4, "0")}`,
    agenda_date:    ["Percentage", "Fixed Count", "Role-Based"][i % 3],
    meeting_type2:  ["All Meetings", "Regular"][i % 2],
    approved_amount: String([3, 4, 5, 6][i % 4]),
    disbursed_amount: `${[50, 67, 75][i % 3]}%`,
    outstanding:    `2024-0${(i % 9) + 1}-01`,
    approval_status: ["Active", "Inactive", "Draft"][i % 3],
    name:           CIRCLES_DATA[i % 8],
  }));

  const displayRows = rows.length > 0 ? rows : fallbackRows;

  const kpis: KpiDef[] = [
    { label: "Total Rules",  value: String(displayRows.length),                                                         tone: "primary"  },
    { label: "Active",       value: String(displayRows.filter(r => r.status === "Active" || r.approval_status === "Active").length), tone: "success"  },
    { label: "Governance Bodies", value: String(new Set(displayRows.map(r => r.governance_body_name || r.committee)).size), tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Quorum Rules",
    desc:  "Define quorum requirements for each governance body, including minimum attendance thresholds and role requirements.",
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
    rows:      displayRows,
    kpis,
    entryBtn:  "Create Quorum Rule",
    searchPlaceholder: "Search quorum rules",
  };

  return <GenPage cfg={cfg} />;
}

export function VotingMethodsPage() {
  const kpis: KpiDef[] = [
    { label: "Total Methods",  value: String(votingMethodRows.length),                                           tone: "primary"  },
    { label: "Active",         value: String(votingMethodRows.filter(r => r.status === "Active").length),        tone: "success"  },
    { label: "Draft",          value: String(votingMethodRows.filter(r => r.status === "Draft").length),         tone: "neutral"  },
    { label: "Inactive",       value: String(votingMethodRows.filter(r => r.status === "Inactive").length),      tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Voting Methods",
    desc:  "Configure voting methods including majority rules, eligible voters, and applicable meeting types.",
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
    rows:      votingMethodRows,
    kpis,
    entryBtn:  "Create Voting Method",
    searchPlaceholder: "Search voting methods",
  };

  return <GenPage cfg={cfg} />;
}

export function StatusesNumberingPage() {
  const kpis: KpiDef[] = [
    { label: "Total Configs",  value: String(statusRows.length),                                          tone: "primary"  },
    { label: "Active",         value: String(statusRows.filter(r => r.status === "Active").length),       tone: "success"  },
    { label: "Entity Types",   value: String(new Set(statusRows.map(r => r.entity_type)).size),           tone: "neutral"  },
    { label: "Inactive",       value: String(statusRows.filter(r => r.status === "Inactive").length),     tone: "warning"  },
  ];

  const cfg: PageCfg = {
    title: "Statuses & Numbering",
    desc:  "Configure status definitions, display colors, terminal states, and reference number formats for all entity types.",
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
    rows:      statusRows,
    kpis,
    entryBtn:  "Add Status Config",
    searchPlaceholder: "Search statuses and numbering",
  };

  return <GenPage cfg={cfg} />;
}
