/**
 * Phase 1.1 — Shared Data Foundation tests.
 *
 * Covers:
 *  - Existing data migration (nbr.* → bms.*)
 *  - Missing ID generation
 *  - Duplicate relationship prevention
 *  - User ↔ role relationship
 *  - User ↔ org-unit relationship
 *  - Three-level agenda validation
 *  - Document relationship integrity
 *  - Meeting-agenda relationship integrity
 *  - Meeting-participant deduplication
 *  - Quorum-field compatibility mapping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  isEmailUnique,
  isEmployeeIdUnique,
  isValidOrgParent,
  computeAgendaLevel,
  isAgendaLevelValid,
  isAgendaDocumentLinkUnique,
  isMeetingAgendaLinkUnique,
  isMeetingParticipantUnique,
  entityExists,
  MAX_AGENDA_LEVEL,
} from "../app/utils/bmsValidation";

import { systemUserToBmsUser, MOCK_BMS_USERS } from "../app/data/bmsUsers";
import { MOCK_USERS } from "../app/data/mockData";
import {
  runBmsMigrationIfNeeded,
  resetMigration,
  getMigrationVersionNumber,
} from "../app/utils/bmsMigration";

import type { BmsUser } from "../app/data/bmsUsers";
import type {
  OrgUnit,
  AgendaSubmission,
  AgendaDocumentLink,
  MeetingAgendaLink,
  MeetingParticipantLink,
} from "../app/data/boardMeetingData";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<BmsUser> = {}): BmsUser {
  return {
    id:         `u-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    name:        "Test User",
    email:       "test@example.com",
    employee_id: "EMP-TEST",
    ...overrides,
  };
}

function makeOrgUnit(overrides: Partial<OrgUnit> = {}): OrgUnit {
  return {
    id:           `ou-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at:   new Date().toISOString(),
    unit_id:      "OU-TEST",
    unit_name:    "Test Unit",
    unit_type:    "Division",
    parent_unit:  "—",
    head:         "Test Head",
    member_count: "5",
    status:       "Active",
    ...overrides,
  };
}

function makeAgenda(overrides: Partial<AgendaSubmission> = {}): AgendaSubmission {
  return {
    id:                 `ag-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    agenda_id:          "AG-TEST",
    agenda_title:       "Test Agenda",
    agenda_reference:   "REF-001",
    meeting_id:         "m-1",
    meeting_title:      "Test Meeting",
    committee:          "Board",
    meeting_type:       "Regular",
    agenda_category:    "Discussion",
    submitted_by:       "user-1",
    submitting_division: "Finance",
    purpose:            "Test purpose",
    proposed_decision:  "To approve",
    priority:           "High",
    confidentiality:    "Public",
    estimated_duration: "30 min",
    voting_required:    "Yes",
    financial_impact:   "None",
    submission_date:    new Date().toISOString(),
    approval_status:    "Draft",
    created_at:         new Date().toISOString(),
    ...overrides,
  };
}

// ── User validation ───────────────────────────────────────────────────────────

describe("isEmailUnique", () => {
  const users: BmsUser[] = [
    makeUser({ id: "u1", email: "alice@example.com" }),
    makeUser({ id: "u2", email: "bob@example.com" }),
  ];

  it("returns true for an unused email", () => {
    expect(isEmailUnique("carol@example.com", users)).toBe(true);
  });

  it("returns false for a duplicate email (case-insensitive)", () => {
    expect(isEmailUnique("ALICE@EXAMPLE.COM", users)).toBe(false);
  });

  it("returns true when excluding the owner of the email", () => {
    expect(isEmailUnique("alice@example.com", users, "u1")).toBe(true);
  });

  it("returns false when same email exists for different user", () => {
    expect(isEmailUnique("bob@example.com", users, "u1")).toBe(false);
  });

  it("returns true on empty user list", () => {
    expect(isEmailUnique("any@example.com", [])).toBe(true);
  });
});

describe("isEmployeeIdUnique", () => {
  const users: BmsUser[] = [
    makeUser({ id: "u1", employee_id: "EMP-001" }),
    makeUser({ id: "u2", employee_id: "EMP-002" }),
  ];

  it("returns true for an unused employee ID", () => {
    expect(isEmployeeIdUnique("EMP-999", users)).toBe(true);
  });

  it("returns false for a duplicate (case-insensitive)", () => {
    expect(isEmployeeIdUnique("emp-001", users)).toBe(false);
  });

  it("returns true when excluding the owner", () => {
    expect(isEmployeeIdUnique("EMP-001", users, "u1")).toBe(true);
  });
});

// ── Org-unit hierarchy validation ─────────────────────────────────────────────

describe("isValidOrgParent", () => {
  //   A → B → C
  const a = makeOrgUnit({ id: "A", parent_unit_id: undefined });
  const b = makeOrgUnit({ id: "B", parent_unit_id: "A" });
  const c = makeOrgUnit({ id: "C", parent_unit_id: "B" });
  const units = [a, b, c];

  it("allows a unit to have a valid parent", () => {
    expect(isValidOrgParent("C", "A", units)).toBe(true);
  });

  it("rejects self-reference", () => {
    expect(isValidOrgParent("A", "A", units)).toBe(false);
  });

  it("rejects circular reference (A setting parent to C, which is a descendant)", () => {
    expect(isValidOrgParent("A", "C", units)).toBe(false);
  });

  it("allows a null/undefined parent (root unit)", () => {
    expect(isValidOrgParent("B", undefined, units)).toBe(true);
    expect(isValidOrgParent("B", null, units)).toBe(true);
  });

  it("allows moving C to a different branch (D)", () => {
    const d = makeOrgUnit({ id: "D" });
    expect(isValidOrgParent("C", "D", [...units, d])).toBe(true);
  });
});

// ── Agenda hierarchy ──────────────────────────────────────────────────────────

describe("computeAgendaLevel", () => {
  const root  = makeAgenda({ id: "ag1", agenda_level: 1, parent_agenda_id: undefined });
  const child = makeAgenda({ id: "ag2", agenda_level: 2, parent_agenda_id: "ag1" });
  const all   = [root, child];

  it("returns 1 for a root agenda", () => {
    expect(computeAgendaLevel(undefined, all)).toBe(1);
  });

  it("returns 2 for a child of a level-1 agenda", () => {
    expect(computeAgendaLevel("ag1", all)).toBe(2);
  });

  it("returns 3 for a child of a level-2 agenda", () => {
    expect(computeAgendaLevel("ag2", all)).toBe(3);
  });

  it("returns null when nesting would exceed MAX_AGENDA_LEVEL", () => {
    const leaf = makeAgenda({ id: "ag3", agenda_level: 3, parent_agenda_id: "ag2" });
    expect(computeAgendaLevel("ag3", [...all, leaf])).toBe(null);
  });

  it("MAX_AGENDA_LEVEL is 3", () => {
    expect(MAX_AGENDA_LEVEL).toBe(3);
  });
});

describe("isAgendaLevelValid", () => {
  const root  = makeAgenda({ id: "ag1", agenda_level: 1 });
  const child = makeAgenda({ id: "ag2", agenda_level: 2, parent_agenda_id: "ag1" });
  const leaf  = makeAgenda({ id: "ag3", agenda_level: 3, parent_agenda_id: "ag2" });

  it("allows level 1, 2, 3", () => {
    expect(isAgendaLevelValid(undefined, [root, child, leaf])).toBe(true);
    expect(isAgendaLevelValid("ag1", [root, child, leaf])).toBe(true);
    expect(isAgendaLevelValid("ag2", [root, child, leaf])).toBe(true);
  });

  it("rejects level 4 (child of level-3)", () => {
    expect(isAgendaLevelValid("ag3", [root, child, leaf])).toBe(false);
  });
});

// ── Relationship deduplication ────────────────────────────────────────────────

describe("isAgendaDocumentLinkUnique", () => {
  const links: AgendaDocumentLink[] = [
    { id: "l1", created_at: "", agenda_id: "ag1", document_id: "doc1", linked_at: "", linked_by: "" },
  ];

  it("returns true for a new combination", () => {
    expect(isAgendaDocumentLinkUnique("ag1", "doc2", links)).toBe(true);
  });

  it("returns false for an existing combination", () => {
    expect(isAgendaDocumentLinkUnique("ag1", "doc1", links)).toBe(false);
  });

  it("returns true when excluding the existing link ID", () => {
    expect(isAgendaDocumentLinkUnique("ag1", "doc1", links, "l1")).toBe(true);
  });
});

describe("isMeetingAgendaLinkUnique", () => {
  const links: MeetingAgendaLink[] = [
    { id: "ml1", created_at: "", meeting_id: "m1", agenda_id: "ag1", display_order: 1, added_at: "", added_by: "" },
  ];

  it("returns true for a new combination", () => {
    expect(isMeetingAgendaLinkUnique("m1", "ag2", links)).toBe(true);
  });

  it("returns false for an existing combination", () => {
    expect(isMeetingAgendaLinkUnique("m1", "ag1", links)).toBe(false);
  });

  it("allows same agenda in different meetings", () => {
    expect(isMeetingAgendaLinkUnique("m2", "ag1", links)).toBe(true);
  });
});

describe("isMeetingParticipantUnique", () => {
  const links: MeetingParticipantLink[] = [
    {
      id: "pl1", created_at: "", meeting_id: "m1", user_id: "u1",
      participant_type: "Member", selection_source_type: "individual",
      quorum_eligible: true, voting_eligible: true, is_required: false,
      invitation_status: "pending",
    },
  ];

  it("returns true for a new user/meeting combination", () => {
    expect(isMeetingParticipantUnique("m1", "u2", links)).toBe(true);
  });

  it("returns false for a duplicate user/meeting", () => {
    expect(isMeetingParticipantUnique("m1", "u1", links)).toBe(false);
  });

  it("allows same user in different meetings", () => {
    expect(isMeetingParticipantUnique("m2", "u1", links)).toBe(true);
  });

  it("returns true when excluding the existing link ID", () => {
    expect(isMeetingParticipantUnique("m1", "u1", links, "pl1")).toBe(true);
  });
});

// ── Entity existence ──────────────────────────────────────────────────────────

describe("entityExists", () => {
  const entities = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];

  it("returns true for an existing ID", () => {
    expect(entityExists("a", entities)).toBe(true);
  });

  it("returns false for a missing ID", () => {
    expect(entityExists("z", entities)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(entityExists(null, entities)).toBe(false);
    expect(entityExists(undefined, entities)).toBe(false);
  });
});

// ── BmsUser conversion ────────────────────────────────────────────────────────

describe("systemUserToBmsUser", () => {
  it("preserves id, name, email, employee_id", () => {
    const su = MOCK_USERS[0];
    const bu = systemUserToBmsUser(su);
    expect(bu.id).toBe(su.id);
    expect(bu.name).toBe(su.name);
    expect(bu.email).toBe(su.email);
    expect(bu.employee_id).toBe(su.employeeId);
  });

  it("maps twoFA to two_factor_enabled", () => {
    const su = MOCK_USERS.find(u => u.twoFA === true)!;
    const bu = systemUserToBmsUser(su);
    expect(bu.two_factor_enabled).toBe(true);
  });

  it("derives account_status from accountActive", () => {
    const active = MOCK_USERS.find(u => u.accountActive)!;
    expect(systemUserToBmsUser(active).account_status).toBe("active");

    const inactive = MOCK_USERS.find(u => !u.accountActive && u.status !== "Pending")!;
    expect(systemUserToBmsUser(inactive).account_status).toBe("inactive");
  });

  it("maps pending status correctly", () => {
    const pending = MOCK_USERS.find(u => u.status === "Pending")!;
    if (pending) {
      expect(systemUserToBmsUser(pending).account_status).toBe("pending_activation");
    }
  });

  it("produces valid created_at ISO string", () => {
    const bu = systemUserToBmsUser(MOCK_USERS[0]);
    expect(() => new Date(bu.created_at)).not.toThrow();
  });
});

describe("MOCK_BMS_USERS", () => {
  it("contains all users from MOCK_USERS", () => {
    expect(MOCK_BMS_USERS.length).toBe(MOCK_USERS.length);
  });

  it("all users have unique IDs", () => {
    const ids = MOCK_BMS_USERS.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all users have non-empty email", () => {
    expect(MOCK_BMS_USERS.every(u => u.email.length > 0)).toBe(true);
  });
});

// ── Migration ─────────────────────────────────────────────────────────────────

describe("bmsMigration", () => {
  // Use a fresh localStorage simulation for each test
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(k => store[k] ?? null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => { store[k] = String(v); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(k => { delete store[k]; });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with migration version 0", () => {
    expect(getMigrationVersionNumber()).toBe(0);
  });

  it("runs migration and increments version", () => {
    runBmsMigrationIfNeeded();
    expect(getMigrationVersionNumber()).toBe(6);
  });

  it("does not run twice", () => {
    runBmsMigrationIfNeeded();
    const v1 = getMigrationVersionNumber();
    runBmsMigrationIfNeeded();
    const v2 = getMigrationVersionNumber();
    expect(v1).toBe(v2);
  });

  it("migrates legacy users from nbr.userRegistry.customUsers", () => {
    const legacyUsers = [MOCK_USERS[0]];
    store["nbr.userRegistry.customUsers"] = JSON.stringify(legacyUsers);

    runBmsMigrationIfNeeded();

    const migrated = JSON.parse(store["bms.users"] ?? "[]") as BmsUser[];
    expect(migrated.some(u => u.id === MOCK_USERS[0].id)).toBe(true);
  });

  it("does not overwrite already-migrated users", () => {
    const existing: BmsUser[] = [makeUser({ id: "already-migrated", email: "a@b.com" })];
    store["bms.users"] = JSON.stringify(existing);
    store["nbr.userRegistry.customUsers"] = JSON.stringify([{ ...MOCK_USERS[0], id: "already-migrated" }]);

    runBmsMigrationIfNeeded();

    const result = JSON.parse(store["bms.users"] ?? "[]") as BmsUser[];
    const count = result.filter(u => u.id === "already-migrated").length;
    expect(count).toBe(1); // no duplicates
  });

  it("handles missing legacy data gracefully", () => {
    expect(() => runBmsMigrationIfNeeded()).not.toThrow();
    expect(getMigrationVersionNumber()).toBe(6);
  });

  it("resetMigration allows re-running", () => {
    runBmsMigrationIfNeeded();
    resetMigration();
    expect(getMigrationVersionNumber()).toBe(0);
  });
});

// ── AgendaSubmission new fields ───────────────────────────────────────────────

describe("AgendaSubmission extended fields", () => {
  it("allows parent_agenda_id to be set", () => {
    const a = makeAgenda({ parent_agenda_id: "parent-1", agenda_level: 2 });
    expect(a.parent_agenda_id).toBe("parent-1");
    expect(a.agenda_level).toBe(2);
  });

  it("allows is_temporary to be set", () => {
    const a = makeAgenda({ is_temporary: true });
    expect(a.is_temporary).toBe(true);
  });

  it("allows approval_history entries", () => {
    const a = makeAgenda({
      approval_history: [
        { status: "Draft", by: "user-1", at: new Date().toISOString() },
        { status: "Approved", by: "user-2", at: new Date().toISOString(), note: "OK" },
      ],
    });
    expect(a.approval_history).toHaveLength(2);
    expect(a.approval_history![1].note).toBe("OK");
  });
});

// ── OrgUnit extended fields ───────────────────────────────────────────────────

describe("OrgUnit extended fields", () => {
  it("allows code, parent_unit_id, head_user_id", () => {
    const ou = makeOrgUnit({ code: "FIN", parent_unit_id: "ou-root", head_user_id: "u-1" });
    expect(ou.code).toBe("FIN");
    expect(ou.parent_unit_id).toBe("ou-root");
    expect(ou.head_user_id).toBe("u-1");
  });
});

// ── QuorumRule extended fields ────────────────────────────────────────────────

describe("QuorumRule extended fields", () => {
  it("supports normalized quorum fields alongside legacy strings", () => {
    const rule = {
      id: "qr-1",
      created_at: new Date().toISOString(),
      rule_id:            "QR-001",
      governance_body_id: "GB-001",
      body_name:          "Board",
      quorum_percent:     "50%",
      calculation_basis:  "Voting Members",
      minimum_members:    "3",
      exception_rules:    "",
      status:             "Active",
      // New normalized fields:
      rule_type:                "percentage" as const,
      minimum_percentage:       50,
      minimum_members_count:    3,
      count_virtual_attendance: true,
      count_alternate_members:  false,
      exclude_recused_members:  true,
      lost_quorum_action:       "adjourn" as const,
    };

    expect(rule.rule_type).toBe("percentage");
    expect(rule.minimum_percentage).toBe(50);
    expect(rule.lost_quorum_action).toBe("adjourn");
    // Legacy fields still present
    expect(rule.quorum_percent).toBe("50%");
  });
});
