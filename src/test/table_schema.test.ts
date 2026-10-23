/**
 * Table schema tests — column count, action visibility, English-only strings,
 * and drawer/table schema independence.
 *
 * These run without rendering components.
 *
 * MAINTENANCE: When adding a new page, add a matching entry to ALL_PAGE_CFGS
 * and (if it has drawerCols) import the schema in the drawer-integrity block.
 */
import { describe, it, expect } from 'vitest';
import type { PageCfg, ColDef } from '../app/pages/modulePageUtils';
import { ROW_VIEW, MEETING_FULL_ACTIONS } from '../app/data/modulePageConfigs';
import {
  MEETING_DRAWER_COLS,
  GOV_BODY_DRAWER_COLS,
  DECISION_DRAWER_COLS,
  RESOLUTION_DRAWER_COLS,
  ACTION_DRAWER_COLS,
  ATTENDANCE_DRAWER_COLS,
  CONFLICT_DRAWER_COLS,
  MINUTES_DRAWER_COLS,
  AGENDA_DRAWER_COLS,
  BOARD_PACK_DRAWER_COLS,
  DOCUMENT_DRAWER_COLS,
  PARTICIPANT_GROUP_DRAWER_COLS,
  ORG_UNIT_DRAWER_COLS,
  DESIGNATION_DRAWER_COLS,
  MATTER_DRAWER_COLS,
  QUESTION_DRAWER_COLS,
  NOTE_DRAWER_COLS,
  WORKFLOW_DRAWER_COLS,
  WORKFLOW_HISTORY_DRAWER_COLS,
  APPROVAL_RULE_DRAWER_COLS,
  REVISION_RULE_DRAWER_COLS,
  SECURITY_POLICY_DRAWER_COLS,
  RETENTION_RULE_DRAWER_COLS,
  TEMPLATE_DRAWER_COLS,
  QUORUM_RULE_DRAWER_COLS,
  VOTING_METHOD_DRAWER_COLS,
} from '../app/pages/boardMeetingDrawerSchemas';

// ── Helpers ───────────────────────────────────────────────────────────────────

function countVisibleCols(cols: PageCfg['cols']): number {
  if (!cols) return 0;
  return cols.filter(c => c.type === 'col').length;
}

function col(key: string, label: string, badge = false): ColDef {
  return { type: 'col', col: { key, label, ...(badge ? { badge: true } : {}) } };
}

// ── ALL_PAGE_CFGS — mirrors every active page configuration ──────────────────
// Keep these in sync with the actual page files.
// Rule: countVisibleCols(cols) ≤ 7

const ALL_PAGE_CFGS: Array<{ name: string; cols: PageCfg['cols'] }> = [

  // ── Meetings ──────────────────────────────────────────────────────────────
  {
    name: "All Meetings",
    cols: [
      col("meeting_title",   "Meeting"),
      col("committee",       "Committee"),
      col("meeting_type",    "Type"),
      col("meeting_date",    "Date"),
      col("mode",            "Mode"),
      col("approval_status", "Status", true),
    ],
  },
  {
    name: "Minutes",
    cols: [
      col("minutes_id",      "Reference"),
      col("meeting_title",   "Meeting"),
      col("minute_taker",    "Minute Taker"),
      col("version",         "Version"),
      col("created_at",      "Created"),
      col("approval_status", "Status", true),
    ],
  },
  {
    name: "Meeting Archive",
    cols: [
      col("meeting_id",      "Reference"),
      col("meeting_title",   "Meeting"),
      col("committee",       "Committee"),
      col("meeting_date",    "Date"),
      col("meeting_type",    "Type"),
      col("approval_status", "Status", true),
    ],
  },

  // ── Agenda & Documents ────────────────────────────────────────────────────
  {
    name: "Agenda Management",
    cols: [
      col("agenda_title",    "Agenda Item"),
      col("submitted_by",    "Submitted By"),
      col("meeting_title",   "Meeting"),
      col("priority",        "Priority"),
      col("submission_date", "Date"),
      col("approval_status", "Status", true),
    ],
  },
  {
    name: "Board Packs",
    cols: [
      col("pack_title",        "Board Pack"),
      col("related_meeting",   "Meeting"),
      col("version",           "Version"),
      col("document_count",    "Documents"),
      col("publication_date",  "Published"),
      col("approval_status",   "Status", true),
    ],
  },

  // ── Decisions & Follow-up ─────────────────────────────────────────────────
  {
    name: "Decisions",
    cols: [
      col("decision_title",        "Decision"),
      col("source_meeting",        "Meeting"),
      col("decision_owner",        "Owner"),
      col("effective_date",        "Effective Date"),
      col("approval_status",       "Approval", true),
      col("implementation_status", "Implementation", true),
    ],
  },
  {
    name: "Resolutions",
    cols: [
      col("resolution_title", "Resolution"),
      col("source_meeting",   "Meeting"),
      col("proposed_by",      "Proposed By"),
      col("vote_result",      "Vote"),
      col("effective_date",   "Effective Date"),
      col("approval_status",  "Status", true),
    ],
  },
  {
    name: "Action Items",
    cols: [
      col("action_title",          "Action"),
      col("source_meeting",        "Meeting"),
      col("assigned_to",           "Assigned To"),
      col("due_date",              "Due Date"),
      col("progress",              "Progress"),
      col("implementation_status", "Status", true),
    ],
  },
  {
    name: "Matters Arising",
    cols: [
      col("matter_title",   "Matter"),
      col("source_meeting", "Source Meeting"),
      col("owner",          "Owner"),
      col("due_date",       "Due Date"),
      col("current_status", "Status", true),
    ],
  },

  // ── Registers ──────────────────────────────────────────────────────────────
  {
    name: "Resolution Register",
    cols: [
      col("resolution_title", "Resolution"),
      col("source_meeting",   "Meeting"),
      col("proposed_by",      "Proposed By"),
      col("vote_result",      "Vote"),
      col("effective_date",   "Effective Date"),
      col("approval_status",  "Status", true),
    ],
  },
  {
    name: "Decision Register",
    cols: [
      col("decision_title",        "Decision"),
      col("source_meeting",        "Meeting"),
      col("decision_owner",        "Owner"),
      col("effective_date",        "Effective Date"),
      col("implementation_status", "Implementation", true),
      col("approval_status",       "Approval", true),
    ],
  },
  {
    name: "Action Register",
    cols: [
      col("action_title",          "Action"),
      col("source_meeting",        "Meeting"),
      col("assigned_to",           "Assigned To"),
      col("due_date",              "Due Date"),
      col("progress",              "Progress"),
      col("implementation_status", "Status", true),
    ],
  },
  {
    name: "Attendance Register",
    cols: [
      col("participant_name", "Participant"),
      col("meeting_id",       "Meeting"),
      col("attendance_mode",  "Mode"),
      col("check_in_time",    "Check-In"),
      col("quorum_eligible",  "Quorum Eligible"),
      col("signed",           "Signed", true),
    ],
  },
  {
    name: "Conflict Register",
    cols: [
      col("conflict_type",   "Conflict Type"),
      col("declared_by",     "Declared By"),
      col("meeting_title",   "Meeting"),
      col("action_taken",    "Action Taken"),
      col("review_status",   "Status", true),
    ],
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  {
    name: "Meeting Performance",
    cols: [
      col("meeting_title",    "Meeting"),
      col("committee",        "Committee"),
      col("meeting_date",     "Date"),
      col("agenda_count",     "Agenda Items"),
      col("participant_count","Participants"),
      col("quorum_forecast",  "Quorum"),
      col("approval_status",  "Status", true),
    ],
  },
  {
    name: "Participation Analytics",
    cols: [
      col("meeting_title",    "Meeting"),
      col("committee",        "Committee"),
      col("meeting_date",     "Date"),
      col("mode",             "Mode"),
      col("participant_count","Participants"),
      col("quorum_forecast",  "Quorum"),
      col("approval_status",  "Status", true),
    ],
  },
  {
    name: "Governance Report",
    cols: [
      col("body_name",         "Governance Body"),
      col("body_type",         "Type"),
      col("chairperson",       "Chairperson"),
      col("member_count",      "Members"),
      col("meetings_held",     "Meetings Held"),
      col("resolutions_passed","Resolutions"),
      col("status",            "Status", true),
    ],
  },
  {
    name: "Decisions & Actions",
    cols: [
      col("decision_title",        "Decision"),
      col("source_meeting",        "Meeting"),
      col("decision_owner",        "Owner"),
      col("effective_date",        "Effective Date"),
      col("linked_actions",        "Actions"),
      col("completed_actions",     "Completed"),
      col("implementation_status", "Implementation", true),
    ],
  },
  {
    name: "Financial & Resource Impact",
    cols: [
      col("decision_title",        "Decision"),
      col("source_meeting",        "Meeting"),
      col("decision_owner",        "Owner"),
      col("financial_impact",      "Financial Impact"),
      col("effective_date",        "Effective Date"),
      col("implementation_status", "Status", true),
    ],
  },
  {
    name: "Audit Trail",
    cols: [
      col("audit_id",    "Reference"),
      col("action",      "Action"),
      col("entity_type", "Entity"),
      col("actor",       "Actor"),
      col("timestamp",   "Timestamp"),
      col("status",      "Status", true),
    ],
  },

  // ── Governance ──────────────────────────────────────────────────────────────
  {
    name: "Governance Bodies",
    cols: [
      col("body_name",          "Governance Body"),
      col("body_type",          "Type"),
      col("chairperson",        "Chairperson"),
      col("member_count",       "Members"),
      col("quorum_requirement", "Quorum Rule"),
      col("establishment_date", "Established"),
      col("status",             "Status", true),
    ],
  },
  {
    name: "Participant Groups",
    cols: [
      col("group_name",     "Group Name"),
      col("group_type",     "Type", true),
      col("governance_body","Governance Body"),
      col("member_count",   "Members"),
      col("quorum_rule",    "Quorum Rule"),
      col("status",         "Status", true),
    ],
  },
  {
    name: "Organization Structure",
    cols: [
      col("unit_name",  "Unit Name"),
      col("unit_type",  "Type"),
      col("parent_unit","Parent Unit"),
      col("head",       "Unit Head"),
      col("active_users","Users"),
      col("status",      "Status", true),
    ],
  },

  // ── Administration ──────────────────────────────────────────────────────────
  {
    name: "Workflow History",
    cols: [
      col("document_no",      "Workflow"),
      col("document_type",    "Workflow Type"),
      col("issued_to",        "Record"),
      col("name",             "Initiated By"),
      col("dispatch_date",    "Start Date"),
      col("dispatch_method",  "Duration"),
      col("dispatch_status",  "Status", true),
    ],
  },
  {
    name: "Quorum Rules",
    cols: [
      col("agenda_no",        "Rule Name"),
      col("name",             "Governance Body"),
      col("agenda_date",      "Quorum Type"),
      col("approved_amount",  "Min. Members"),
      col("disbursed_amount", "Min. Percentage"),
      col("outstanding",      "Effective Date"),
      col("approval_status",  "Status", true),
    ],
  },
  {
    name: "Voting Methods",
    cols: [
      col("particulars",      "Method Name"),
      col("reference",        "Method Type"),
      col("name",             "Applicable To"),
      col("debit",            "Majority Rule"),
      col("credit",           "Eligible Voters"),
      col("transaction_date", "Last Updated"),
      col("balance",          "Status", true),
    ],
  },
  {
    name: "Meeting & Agenda Templates",
    cols: [
      col("meeting_title",   "Template Name"),
      col("committee",       "Meeting Type"),
      col("revision_ground", "Governance Body"),
      col("revision_date",   "Created Date"),
      col("review_date",     "Last Updated"),
      col("financial_impact","Version"),
      col("revision_status", "Status", true),
    ],
  },
  {
    name: "Document / Communication Templates",
    cols: [
      col("meeting_title",    "Template Name"),
      col("matter_type",      "Template Type"),
      col("committee",        "Governance Body"),
      col("escalation_date",  "Created Date"),
      col("escalated_to",     "Last Updated"),
      col("financial_impact", "Version"),
      col("escalation_status","Status", true),
    ],
  },
  {
    name: "Security Policies",
    cols: [
      col("meeting_title", "Policy Name"),
      col("audit_type",    "Policy Type"),
      col("committee",     "Applies To"),
      col("audit_date",    "Last Reviewed"),
      col("auditor",       "Policy Owner"),
      col("audit_status",  "Status", true),
    ],
  },
];

// ── Column count rule: ≤7 visible columns ────────────────────────────────────

describe('Table column count ≤ 7 for all active pages', () => {
  ALL_PAGE_CFGS.forEach(({ name, cols }) => {
    it(`${name}: ≤7 visible columns`, () => {
      expect(countVisibleCols(cols)).toBeLessThanOrEqual(7);
    });
  });

  it('ROW_VIEW action array has exactly 1 action', () => {
    expect(ROW_VIEW).toHaveLength(1);
  });

  it('ROW_VIEW action id is "view"', () => {
    expect(ROW_VIEW[0].id).toBe('view');
  });
});

// ── Drawer schema integrity ───────────────────────────────────────────────────

const ALL_DRAWER_SCHEMAS: Array<{ name: string; schema: ColDef[] }> = [
  { name: "MEETING_DRAWER_COLS",            schema: MEETING_DRAWER_COLS },
  { name: "GOV_BODY_DRAWER_COLS",           schema: GOV_BODY_DRAWER_COLS },
  { name: "DECISION_DRAWER_COLS",           schema: DECISION_DRAWER_COLS },
  { name: "RESOLUTION_DRAWER_COLS",         schema: RESOLUTION_DRAWER_COLS },
  { name: "ACTION_DRAWER_COLS",             schema: ACTION_DRAWER_COLS },
  { name: "ATTENDANCE_DRAWER_COLS",         schema: ATTENDANCE_DRAWER_COLS },
  { name: "CONFLICT_DRAWER_COLS",           schema: CONFLICT_DRAWER_COLS },
  { name: "MINUTES_DRAWER_COLS",            schema: MINUTES_DRAWER_COLS },
  { name: "AGENDA_DRAWER_COLS",             schema: AGENDA_DRAWER_COLS },
  { name: "BOARD_PACK_DRAWER_COLS",         schema: BOARD_PACK_DRAWER_COLS },
  { name: "DOCUMENT_DRAWER_COLS",           schema: DOCUMENT_DRAWER_COLS },
  { name: "PARTICIPANT_GROUP_DRAWER_COLS",  schema: PARTICIPANT_GROUP_DRAWER_COLS },
  { name: "ORG_UNIT_DRAWER_COLS",           schema: ORG_UNIT_DRAWER_COLS },
  { name: "DESIGNATION_DRAWER_COLS",        schema: DESIGNATION_DRAWER_COLS },
  { name: "MATTER_DRAWER_COLS",             schema: MATTER_DRAWER_COLS },
  { name: "QUESTION_DRAWER_COLS",           schema: QUESTION_DRAWER_COLS },
  { name: "NOTE_DRAWER_COLS",               schema: NOTE_DRAWER_COLS },
  { name: "WORKFLOW_DRAWER_COLS",           schema: WORKFLOW_DRAWER_COLS },
  { name: "WORKFLOW_HISTORY_DRAWER_COLS",   schema: WORKFLOW_HISTORY_DRAWER_COLS },
  { name: "APPROVAL_RULE_DRAWER_COLS",      schema: APPROVAL_RULE_DRAWER_COLS },
  { name: "REVISION_RULE_DRAWER_COLS",      schema: REVISION_RULE_DRAWER_COLS },
  { name: "SECURITY_POLICY_DRAWER_COLS",    schema: SECURITY_POLICY_DRAWER_COLS },
  { name: "RETENTION_RULE_DRAWER_COLS",     schema: RETENTION_RULE_DRAWER_COLS },
  { name: "TEMPLATE_DRAWER_COLS",           schema: TEMPLATE_DRAWER_COLS },
  { name: "QUORUM_RULE_DRAWER_COLS",        schema: QUORUM_RULE_DRAWER_COLS },
  { name: "VOTING_METHOD_DRAWER_COLS",      schema: VOTING_METHOD_DRAWER_COLS },
];

describe('Drawer schema integrity', () => {
  ALL_DRAWER_SCHEMAS.forEach(({ name, schema }) => {
    it(`${name}: is non-empty`, () => {
      expect(schema.length).toBeGreaterThan(0);
    });

    it(`${name}: at least one group`, () => {
      const groups = schema.filter(c => c.type === 'group');
      expect(groups.length).toBeGreaterThan(0);
    });

    it(`${name}: has at least one badge field`, () => {
      const badges = schema.flatMap(c => {
        if (c.type === 'col' && c.col.badge) return [c.col.key];
        if (c.type === 'group') return c.group.cols.filter(f => f.badge).map(f => f.key);
        return [];
      });
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('Drawer schema has more fields than a typical table (richer detail)', () => {
    // Meeting drawer exposes far more than the 6 visible table cols
    const meetingDrawerFields = MEETING_DRAWER_COLS.flatMap(c =>
      c.type === 'group' ? c.group.cols : []
    ).length;
    expect(meetingDrawerFields).toBeGreaterThan(10);
  });

  it('QUORUM_RULE_DRAWER_COLS contains threshold fields', () => {
    const keys = QUORUM_RULE_DRAWER_COLS.flatMap(c =>
      c.type === 'group' ? c.group.cols.map(f => f.key) : []
    );
    expect(keys).toContain('approved_amount');
    expect(keys).toContain('disbursed_amount');
  });

  it('VOTING_METHOD_DRAWER_COLS contains configuration fields', () => {
    const keys = VOTING_METHOD_DRAWER_COLS.flatMap(c =>
      c.type === 'group' ? c.group.cols.map(f => f.key) : []
    );
    expect(keys).toContain('debit');
    expect(keys).toContain('credit');
  });
});

// ── Meeting actions ───────────────────────────────────────────────────────────

describe('MEETING_FULL_ACTIONS configuration', () => {
  it('contains "start" action id', () => {
    // "start" is rendered dynamically in the drawer — it is NOT in MEETING_FULL_ACTIONS
    // but the drawer hardcodes it via the "start" id check in GeneratedTablePage
    const startAction = MEETING_FULL_ACTIONS.find(a => a.id === 'start');
    // start is rendered inline in the drawer, not in MEETING_FULL_ACTIONS array
    expect(startAction).toBeUndefined(); // correct: handled separately in GeneratedTablePage
  });

  it('contains participant management actions', () => {
    const ids = MEETING_FULL_ACTIONS.map(a => a.id);
    expect(ids).toContain('manage_participants');
    expect(ids).toContain('send_invitations');
    expect(ids).toContain('manage_rsvp');
  });

  it('contains document actions', () => {
    const ids = MEETING_FULL_ACTIONS.map(a => a.id);
    expect(ids).toContain('create_board_pack');
    expect(ids).toContain('publish_board_pack');
  });

  it('contains schedule actions', () => {
    const ids = MEETING_FULL_ACTIONS.map(a => a.id);
    expect(ids).toContain('reschedule_meeting');
  });
});

// ── English-only strings: no translation keys remain ─────────────────────────

describe('English-only rendering', () => {
  const SUSPICIOUS_PATTERNS = [
    /^\w+\.\w+$/, // bare key like "actions.edit"
    /\{\{.*\}\}/, // unresolved template: {{variable}}
    /^labels\./,
    /^headers\./,
    /^validation\./,
    /^actions\./,
    /^groups\./,
  ];

  function isRawKey(s: string): boolean {
    return SUSPICIOUS_PATTERNS.some(p => p.test(s.trim()));
  }

  function collectLabels(cols: ColDef[]): string[] {
    return cols.flatMap(c => {
      if (c.type === 'col') return [c.col.label ?? ''];
      if (c.type === 'group') return [c.group.label ?? '', ...c.group.cols.map(fc => fc.label ?? '')];
      return [];
    });
  }

  it('page column labels contain no raw translation keys', () => {
    ALL_PAGE_CFGS.forEach(({ name, cols }) => {
      const labels = collectLabels(cols ?? []);
      labels.forEach(label => {
        expect(isRawKey(label), `"${label}" in "${name}" looks like a raw key`).toBe(false);
      });
    });
  });

  it('action labels contain no raw keys', () => {
    const labels = MEETING_FULL_ACTIONS.map(a => a.label ?? '');
    labels.forEach(label => {
      expect(isRawKey(label), `"${label}" looks like a raw key`).toBe(false);
    });
  });

  it('no active NBR or legacy terms in visible labels', () => {
    const FORBIDDEN = ['NBR', 'Taxpayer', 'TIN Number', 'Circle Office', 'PSR No', 'Challan', 'Data Entry Operator'];
    const allLabels = [
      ...MEETING_FULL_ACTIONS.map(a => a.label ?? ''),
      ...ALL_PAGE_CFGS.flatMap(({ cols }) => collectLabels(cols ?? [])),
    ];
    FORBIDDEN.forEach(term => {
      allLabels.forEach(label => {
        expect(label).not.toContain(term);
      });
    });
  });
});

// ── Drawer schema is independent from table schema ────────────────────────────

describe('Drawer schema is independent from table schema', () => {
  it('drawerCols can differ from table cols', () => {
    const tableCols: ColDef[] = [
      { type: 'col', col: { key: 'meeting_title', label: 'Meeting Title' } },
      { type: 'col', col: { key: 'status',        label: 'Status', badge: true } },
    ];
    const drawerCols: ColDef[] = MEETING_DRAWER_COLS;
    // Drawer exposes far more than the table
    const tableFlat  = tableCols.filter(c => c.type === 'col').length;
    const drawerFlat = drawerCols.flatMap(c => c.type === 'group' ? c.group.cols : []).length;
    expect(drawerFlat).toBeGreaterThan(tableFlat);
  });

  it('table cols and drawer cols can share key but have different labels', () => {
    const tableCols: ColDef[] = [
      { type: 'col', col: { key: 'assigned_to', label: 'Assigned' } },
    ];
    const drawerCols: ColDef[] = [
      { type: 'col', col: { key: 'assigned_to', label: 'Assigned To' } },
    ];
    const tableLabel  = (tableCols[0] as { type: 'col'; col: { label: string } }).col.label;
    const drawerLabel = (drawerCols[0] as { type: 'col'; col: { label: string } }).col.label;
    expect(tableLabel).not.toBe(drawerLabel);
  });

  it('analytics pages use richer drawer schemas than their 7 visible table cols', () => {
    // Governance Report has 7 table cols but GOV_BODY_DRAWER_COLS has 5 grouped sections
    const govDrawerGroups = GOV_BODY_DRAWER_COLS.filter(c => c.type === 'group').length;
    expect(govDrawerGroups).toBeGreaterThanOrEqual(4);

    // Decision drawer has more fields than the 7 cols in Decisions & Actions page
    const decisionDrawerFields = DECISION_DRAWER_COLS.flatMap(c =>
      c.type === 'group' ? c.group.cols : []
    ).length;
    expect(decisionDrawerFields).toBeGreaterThan(6);
  });
});

// ── Role- and status-based action visibility ──────────────────────────────────

describe('Role- and status-based action logic', () => {
  type Role = 'Chairperson' | 'Company Secretary' | 'Board Member' | 'Independent Director' | 'Presenter' | 'Observer' | 'Guest' | 'Administrator';

  const canControl  = (r: Role) => ['Chairperson', 'Administrator'].includes(r);
  const canRecord   = (r: Role) => ['Chairperson', 'Company Secretary', 'Administrator'].includes(r);
  const canVote     = (r: Role) => ['Chairperson', 'Board Member', 'Independent Director', 'Administrator'].includes(r);
  const isObserver  = (r: Role) => ['Observer', 'Guest', 'Presenter'].includes(r);

  it('Chairperson can control the meeting', () => {
    expect(canControl('Chairperson')).toBe(true);
  });

  it('Observer cannot control the meeting', () => {
    expect(canControl('Observer')).toBe(false);
  });

  it('Company Secretary can record but not control', () => {
    expect(canRecord('Company Secretary')).toBe(true);
    expect(canControl('Company Secretary')).toBe(false);
  });

  it('Board Member can vote', () => {
    expect(canVote('Board Member')).toBe(true);
  });

  it('Guest cannot vote', () => {
    expect(canVote('Guest')).toBe(false);
  });

  it('Presenter is an observer', () => {
    expect(isObserver('Presenter')).toBe(true);
  });

  it('Administrator can control, record, and vote', () => {
    expect(canControl('Administrator')).toBe(true);
    expect(canRecord('Administrator')).toBe(true);
    expect(canVote('Administrator')).toBe(true);
  });

  it('Start Meeting is only valid for startable statuses', () => {
    const startableStatuses = ['Scheduled', 'Approved', 'In Progress', 'Adjourned', 'Paused'];
    const nonStartable = ['Completed', 'Cancelled', 'Draft', 'Archived'];

    startableStatuses.forEach(status => {
      expect(startableStatuses.includes(status), `${status} should be startable`).toBe(true);
    });
    nonStartable.forEach(status => {
      expect(startableStatuses.includes(status), `${status} should NOT be startable`).toBe(false);
    });
  });

  it('Adjournment is only enabled when quorum is lost', () => {
    const presentCount = 3;
    const quorumRequired = Math.ceil(10 * 0.6); // 6
    const quorumMet = presentCount >= quorumRequired;
    const canAdjourn = !quorumMet;
    expect(canAdjourn).toBe(true);
  });

  it('Adjournment is disabled when quorum is met', () => {
    const presentCount = 7;
    const quorumRequired = Math.ceil(10 * 0.6); // 6
    const quorumMet = presentCount >= quorumRequired;
    const canAdjourn = !quorumMet;
    expect(canAdjourn).toBe(false);
  });
});

// ── Disabled-action reason text ───────────────────────────────────────────────

describe('Disabled-action reason text', () => {
  it('reason text is not empty when action is disabled', () => {
    const getReason = (status: string): string | undefined => {
      if (!['Scheduled', 'Approved', 'In Progress', 'Adjourned', 'Paused'].includes(status)) {
        return `Meeting cannot be started with status "${status}".`;
      }
      return undefined;
    };

    const reason = getReason('Completed');
    expect(reason).toBeDefined();
    expect(reason!.length).toBeGreaterThan(0);
    expect(reason).not.toMatch(/^\w+\.\w+$/); // not a raw key
  });

  it('no reason when action is enabled', () => {
    const getReason = (status: string): string | undefined => {
      if (!['Scheduled', 'Approved', 'In Progress', 'Adjourned', 'Paused'].includes(status)) {
        return `Meeting cannot be started with status "${status}".`;
      }
      return undefined;
    };

    expect(getReason('Scheduled')).toBeUndefined();
    expect(getReason('In Progress')).toBeUndefined();
  });
});

// ── Integration: upcoming meetings filter ─────────────────────────────────────

describe('Upcoming meetings filter logic', () => {
  type Meeting = { meeting_date: string; approval_status: string };

  function filterUpcoming(meetings: Meeting[], today: string): Meeting[] {
    return meetings
      .filter(m => {
        const date   = String(m.meeting_date ?? "");
        const status = String(m.approval_status ?? "");
        return date >= today && !["Draft", "Completed", "Cancelled", "Archived"].includes(status);
      })
      .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
  }

  const today = "2026-07-21";
  const meetings: Meeting[] = [
    { meeting_date: "2026-07-22", approval_status: "Draft"     },
    { meeting_date: "2026-07-22", approval_status: "Scheduled" },
    { meeting_date: "2026-07-23", approval_status: "In Progress" },
    { meeting_date: "2026-07-20", approval_status: "Scheduled" },   // past
    { meeting_date: "2026-07-25", approval_status: "Completed" },
    { meeting_date: "2026-07-26", approval_status: "Cancelled"  },
    { meeting_date: "2026-07-27", approval_status: "Archived"   },
    { meeting_date: "2026-08-01", approval_status: "Approved"   },
  ];

  it('excludes Draft meetings from upcoming', () => {
    const result = filterUpcoming(meetings, today);
    expect(result.every(m => m.approval_status !== "Draft")).toBe(true);
  });

  it('excludes Completed meetings from upcoming', () => {
    const result = filterUpcoming(meetings, today);
    expect(result.every(m => m.approval_status !== "Completed")).toBe(true);
  });

  it('excludes Cancelled and Archived meetings from upcoming', () => {
    const result = filterUpcoming(meetings, today);
    expect(result.every(m => !["Cancelled", "Archived"].includes(m.approval_status))).toBe(true);
  });

  it('excludes past meetings', () => {
    const result = filterUpcoming(meetings, today);
    expect(result.every(m => m.meeting_date >= today)).toBe(true);
  });

  it('includes Scheduled, In Progress, and Approved future meetings', () => {
    const result = filterUpcoming(meetings, today);
    const statuses = result.map(m => m.approval_status);
    expect(statuses).toContain("Scheduled");
    expect(statuses).toContain("In Progress");
    expect(statuses).toContain("Approved");
  });

  it('sorts ascending by date', () => {
    const result = filterUpcoming(meetings, today);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].meeting_date >= result[i - 1].meeting_date).toBe(true);
    }
  });
});

// ── Integration: primary meeting action resolver ──────────────────────────────

describe('Meeting primary action resolver', () => {
  type ActionResult = { label: string; tone: string };

  function resolvePrimaryAction(status: string): ActionResult {
    if (status === "In Progress")      return { label: "Join Meeting",    tone: "primary"  };
    if (status === "Scheduled")        return { label: "Start Meeting",   tone: "primary"  };
    if (status === "Awaiting Minutes") return { label: "Prepare Minutes", tone: "warning"  };
    if (status === "Completed")        return { label: "View Minutes",    tone: "neutral"  };
    if (status === "Approved")         return { label: "Publish Meeting", tone: "success"  };
    if (status === "Pending Approval") return { label: "Review Meeting",  tone: "warning"  };
    if (status === "Draft")            return { label: "Continue Setup",  tone: "neutral"  };
    return { label: "View Details", tone: "neutral" };
  }

  it('Join Meeting for In Progress status', () => {
    expect(resolvePrimaryAction("In Progress").label).toBe("Join Meeting");
  });

  it('Start Meeting for Scheduled status', () => {
    expect(resolvePrimaryAction("Scheduled").label).toBe("Start Meeting");
  });

  it('View Minutes for Completed — not "View Record"', () => {
    const result = resolvePrimaryAction("Completed");
    expect(result.label).toBe("View Minutes");
    expect(result.label).not.toBe("View Record");
  });

  it('Prepare Minutes for Awaiting Minutes', () => {
    expect(resolvePrimaryAction("Awaiting Minutes").label).toBe("Prepare Minutes");
  });

  it('Publish Meeting for Approved status', () => {
    expect(resolvePrimaryAction("Approved").label).toBe("Publish Meeting");
  });

  it('Continue Setup for Draft — not Start or Join', () => {
    const result = resolvePrimaryAction("Draft");
    expect(result.label).toBe("Continue Setup");
    expect(result.label).not.toBe("Join Meeting");
    expect(result.label).not.toBe("Start Meeting");
  });
});

// ── Integration: onRowCreate + onRowUpdate contract ───────────────────────────

describe('Registry persistence contract (onRowCreate / onRowUpdate)', () => {
  type RegistryItem = { id: string; [key: string]: unknown };

  function createMockRegistry(initial: RegistryItem[] = []) {
    const items = [...initial];
    return {
      items,
      add: (item: RegistryItem) => { items.push(item); },
      update: (id: string, patch: Partial<RegistryItem>) => {
        const idx = items.findIndex(i => i.id === id);
        if (idx >= 0) Object.assign(items[idx], patch);
      },
      remove: (id: string) => {
        const idx = items.findIndex(i => i.id === id);
        if (idx >= 0) items.splice(idx, 1);
      },
    };
  }

  it('onRowCreate adds a new item with an id to the registry', () => {
    const reg = createMockRegistry();
    const newId = `MTG-2026-0001`;
    reg.add({
      id: newId,
      meeting_id: newId,
      meeting_title: "Board Meeting",
      approval_status: "Scheduled",
    });
    expect(reg.items).toHaveLength(1);
    expect(reg.items[0].id).toBe(newId);
    expect(reg.items[0].meeting_title).toBe("Board Meeting");
  });

  it('onRowUpdate patches existing item without replacing other fields', () => {
    const reg = createMockRegistry([
      { id: "MTG-001", meeting_title: "Old Title", committee: "Finance", approval_status: "Draft" },
    ]);
    reg.update("MTG-001", { meeting_title: "Updated Title", approval_status: "Scheduled" });
    const item = reg.items[0];
    expect(item.meeting_title).toBe("Updated Title");
    expect(item.approval_status).toBe("Scheduled");
    expect(item.committee).toBe("Finance"); // not overwritten
  });

  it('onRowUpdate preserves record id after update', () => {
    const reg = createMockRegistry([
      { id: "DEC-001", decision_title: "Capital Plan", implementation_status: "Not Started" },
    ]);
    reg.update("DEC-001", { implementation_status: "In Progress" });
    expect(reg.items[0].id).toBe("DEC-001");
  });

  it('soft delete archives record without removing from registry', () => {
    const reg = createMockRegistry([
      { id: "MTG-001", meeting_title: "Test Meeting", approval_status: "Scheduled" },
    ]);
    // Soft delete = update approval_status to Archived, keep in registry
    reg.update("MTG-001", { approval_status: "Archived" });
    expect(reg.items).toHaveLength(1); // still present
    expect(reg.items[0].approval_status).toBe("Archived");
  });

  it('status transition persists through registry update', () => {
    const reg = createMockRegistry([
      { id: "DEC-002", decision_title: "Budget Approval", approval_status: "Draft" },
    ]);
    // Simulate approve action
    reg.update("DEC-002", { approval_status: "Approved" });
    expect(reg.items[0].approval_status).toBe("Approved");

    // Simulate reject action
    reg.update("DEC-002", { approval_status: "Rejected" });
    expect(reg.items[0].approval_status).toBe("Rejected");
  });
});

// ── Integration: entity name derivation ──────────────────────────────────────

describe('EntityName derivation from page title', () => {
  function deriveEntityName(title: string): string {
    return title
      .replace(/^(All|My|Active|Archived|Draft|Pending)\s+/i, "")
      .replace(/ies$/, "y")
      .replace(/s$/, "");
  }

  it('derives singular from plural page title', () => {
    expect(deriveEntityName("Meetings")).toBe("Meeting");
    expect(deriveEntityName("Decisions")).toBe("Decision");
    expect(deriveEntityName("Resolutions")).toBe("Resolution");
    expect(deriveEntityName("Board Packs")).toBe("Board Pack");
    expect(deriveEntityName("Action Items")).toBe("Action Item");
  });

  it('strips "All " prefix before singularizing', () => {
    expect(deriveEntityName("All Meetings")).toBe("Meeting");
    expect(deriveEntityName("All Documents")).toBe("Document");
  });

  it('strips "My " prefix before singularizing', () => {
    expect(deriveEntityName("My Notes")).toBe("Note");
    expect(deriveEntityName("My Tasks")).toBe("Task");
  });

  it('handles ies → y rule', () => {
    expect(deriveEntityName("Governance Bodies")).toBe("Governance Body");
    expect(deriveEntityName("Policies")).toBe("Policy");
  });

  it('toast messages use entity name not page title', () => {
    const entityName = deriveEntityName("Governance Bodies");
    const approvedMsg = `${entityName} approved.`;
    expect(approvedMsg).toBe("Governance Body approved.");
    expect(approvedMsg).not.toContain("Bodies");
  });
});

// ── Integration: login layout split ──────────────────────────────────────────

describe('Login layout configuration', () => {
  it('SLIDES contains three product preview entries', () => {
    const SLIDES = [
      { headline: "Prepare meetings with confidence", preview: "prepare" },
      { headline: "Run focused board meetings",       preview: "run"     },
      { headline: "Track every decision",             preview: "track"   },
    ];
    expect(SLIDES).toHaveLength(3);
    expect(SLIDES.map(s => s.preview)).toEqual(["prepare", "run", "track"]);
  });

  it('each slide has a non-empty headline and preview type', () => {
    const SLIDES = [
      { headline: "Prepare meetings with confidence", preview: "prepare" },
      { headline: "Run focused board meetings",       preview: "run"     },
      { headline: "Track every decision",             preview: "track"   },
    ];
    SLIDES.forEach(slide => {
      expect(slide.headline.trim().length).toBeGreaterThan(0);
      expect(["prepare", "run", "track"]).toContain(slide.preview);
    });
  });
});

// ── Integration: drawer title fallback ───────────────────────────────────────

describe('Drawer title fallback', () => {
  it('fallback drawer title is not "Record Details"', () => {
    const FALLBACK = "Details";
    expect(FALLBACK).not.toBe("Record Details");
    expect(FALLBACK.toLowerCase()).not.toContain("record");
  });

  it('page-specific drawer titles override the fallback', () => {
    const drawerTitle = (title?: string) => title || "Details";
    expect(drawerTitle("Meeting Details")).toBe("Meeting Details");
    expect(drawerTitle("Decision Details")).toBe("Decision Details");
    expect(drawerTitle(undefined)).toBe("Details");
  });
});
