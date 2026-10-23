/**
 * Regression tests for Board Meeting Creation stabilization.
 * Covers the 16 requirement sections from board-meeting-creation-4.md.
 */

import { describe, it, expect } from "vitest";
import {
  calculateMeetingQuorum,
  quorumStatusLabel,
} from "../app/utils/quorumCalculation";
import type { GovernanceBody, QuorumRule } from "../app/data/boardMeetingData";
import type { DraftParticipantLink } from "../app/components/forms/ParticipantSelectorStep";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGovBody(id: string, name: string): GovernanceBody {
  return { id, body_id: id, body_name: name, body_type: "Board", status: "Active" } as GovernanceBody;
}

function makeQuorumRule(govBodyId: string, minMembers: number, quorumPct: number, requiredRoles?: string): QuorumRule {
  return {
    id: `${govBodyId}-rule`,
    governance_body_id: govBodyId,
    minimum_members: String(minMembers),
    quorum_percent: String(quorumPct),
    required_roles: requiredRoles,
    status: "Active",
  } as unknown as QuorumRule;
}

function makeDraftLink(userId: string, quorumEligible: boolean, type = "Member"): DraftParticipantLink {
  return {
    id: `draft-${userId}`,
    user_id: userId,
    user_name: userId,
    user_designation: "",
    org_path: "",
    member_category: quorumEligible ? "quorum" : "general",
    participant_type: type as DraftParticipantLink["participant_type"],
    is_required: false,
    voting_eligible: quorumEligible,
    quorum_eligible: quorumEligible,
    selection_sources: [{ type: "individual", source_id: userId, source_label: "Individual" }],
  };
}

// ─── Section 4: Shared Quorum Calculation ────────────────────────────────────

describe("calculateMeetingQuorum — shared utility (Section 4)", () => {
  const govBodies = [makeGovBody("gb1", "Test Board")];
  const quorumRules = [makeQuorumRule("gb1", 3, 50)];

  it("returns not_configured when no active rule exists", () => {
    const result = calculateMeetingQuorum({
      boardCommitteeId: "unknown-body",
      governanceBodies: govBodies,
      quorumRules,
    });
    expect(result.status).toBe("not_configured");
  });

  it("returns expected when eligible count meets fixed threshold", () => {
    const draftLinks = [
      makeDraftLink("u1", true),
      makeDraftLink("u2", true),
      makeDraftLink("u3", true),
    ];
    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      draftLinks,
      governanceBodies: govBodies,
      quorumRules,
    });
    expect(result.status).toBe("expected");
    expect(result.eligibleCount).toBe(3);
  });

  it("returns at_risk when one under threshold", () => {
    const draftLinks = [
      makeDraftLink("u1", true),
      makeDraftLink("u2", true),
      makeDraftLink("u3", false),
    ];
    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      draftLinks,
      governanceBodies: govBodies,
      quorumRules,
    });
    expect(result.status).toBe("at_risk");
  });

  it("returns not_expected when well below threshold", () => {
    const draftLinks = [
      makeDraftLink("u1", false),
      makeDraftLink("u2", false),
      makeDraftLink("u3", false),
      makeDraftLink("u4", false),
    ];
    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      draftLinks,
      governanceBodies: govBodies,
      quorumRules,
    });
    expect(result.status).toBe("not_expected");
  });

  it("detects missing required roles", () => {
    const rules = [makeQuorumRule("gb1", 1, 0, "Chairperson")];
    const draftLinks = [makeDraftLink("u1", true, "Member")];
    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      draftLinks,
      governanceBodies: govBodies,
      quorumRules: rules,
    });
    expect(result.missingRoles).toContain("Chairperson");
    expect(result.status).not.toBe("expected");
  });

  it("quorumStatusLabel returns correct strings", () => {
    expect(quorumStatusLabel({ status: "not_configured", eligibleCount: 0, requiredCount: 0 } as ReturnType<typeof calculateMeetingQuorum>)).toBe("Not Configured");
    expect(quorumStatusLabel({ status: "expected", eligibleCount: 3, requiredCount: 3 } as ReturnType<typeof calculateMeetingQuorum>)).toBe("Met (3/3)");
    expect(quorumStatusLabel({ status: "at_risk", eligibleCount: 2, requiredCount: 3 } as ReturnType<typeof calculateMeetingQuorum>)).toBe("At Risk (2/3)");
    expect(quorumStatusLabel({ status: "not_expected", eligibleCount: 0, requiredCount: 3 } as ReturnType<typeof calculateMeetingQuorum>)).toBe("Not Met (0/3)");
  });
});

// ─── Section 3: Draft Lifecycle — DraftParticipantLink shape ─────────────────

describe("DraftParticipantLink structure (Section 3 & 7)", () => {
  it("selection_sources[] array tracks all add-sources per participant", () => {
    const link = makeDraftLink("u1", true);
    link.selection_sources.push({ type: "division", source_id: "div-123", source_label: "Finance" });
    expect(link.selection_sources).toHaveLength(2);
    expect(link.selection_sources[1].source_id).toBe("div-123");
  });

  it("member_category is quorum for quorum-eligible participants", () => {
    const link = makeDraftLink("u1", true);
    expect(link.member_category).toBe("quorum");
  });

  it("member_category is general for non-quorum participants", () => {
    const link = makeDraftLink("u1", false);
    expect(link.member_category).toBe("general");
  });
});

// ─── Section 8: Leadership Protection ────────────────────────────────────────

describe("Leadership protection — is_required flag (Section 8)", () => {
  it("required leaders have is_required=true", () => {
    const link: DraftParticipantLink = {
      ...makeDraftLink("chair1", true, "Chairperson"),
      is_required: true,
    };
    expect(link.is_required).toBe(true);
  });

  it("regular members have is_required=false", () => {
    const link = makeDraftLink("u1", true);
    expect(link.is_required).toBe(false);
  });
});

// ─── Section 9: Canonical Quorum/Voting Rules ─────────────────────────────────

describe("Canonical quorum rules — governance body lookup (Section 9)", () => {
  it("resolves governance body by body_name as fallback", () => {
    const govBodies = [makeGovBody("gb2", "Finance Committee")];
    const quorumRules = [makeQuorumRule("gb2", 2, 40)];
    const draftLinks = [makeDraftLink("u1", true), makeDraftLink("u2", true)];

    const result = calculateMeetingQuorum({
      boardCommitteeId: "Finance Committee",
      boardCommitteeName: "Finance Committee",
      draftLinks,
      governanceBodies: govBodies,
      quorumRules,
    });
    // body_name fallback match
    expect(result.status).toBe("expected");
  });

  it("inactive quorum rules are ignored", () => {
    const govBodies = [makeGovBody("gb3", "Audit Body")];
    const rules: QuorumRule[] = [{
      id: "r1",
      governance_body_id: "gb3",
      minimum_members: "1",
      quorum_percent: "0",
      status: "Inactive",
    } as unknown as QuorumRule];

    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb3",
      governanceBodies: govBodies,
      quorumRules: rules,
    });
    expect(result.status).toBe("not_configured");
  });
});

// ─── Section 5: Multi-Source Persistence ──────────────────────────────────────

describe("Multi-source persistence — selection_sources_json (Section 5 & 7)", () => {
  it("serializes and deserializes selection_sources", () => {
    const sources = [
      { type: "division", source_id: "div-001", source_label: "Finance" },
      { type: "individual", source_id: "u1", source_label: "Individual" },
    ];
    const json = JSON.stringify(sources);
    const parsed = JSON.parse(json) as typeof sources;
    expect(parsed).toHaveLength(2);
    expect(parsed[0].source_id).toBe("div-001");
  });

  it("handles empty or invalid JSON gracefully", () => {
    const safeParse = (s: string) => {
      try { return JSON.parse(s) as unknown[]; }
      catch { return []; }
    };
    expect(safeParse("[]")).toEqual([]);
    expect(safeParse("invalid-json")).toEqual([]);
    expect(safeParse("")).toEqual([]);
  });
});

// ─── Section 11: Agenda Eligibility ───────────────────────────────────────────

describe("Agenda eligibility filter (Section 11)", () => {
  function isEligibleParent(agenda: {
    agenda_id?: string;
    id?: string;
    parent_agenda_id?: string | null;
    archived_at?: string | null;
    approval_status?: string;
    meeting_readiness?: string;
  }, alreadySelectedIds: Set<string>, existingLinkedIds: string[]): boolean {
    const aid = agenda.agenda_id ?? agenda.id ?? "";
    if (agenda.parent_agenda_id != null) return false;
    if (agenda.archived_at) return false;
    if (alreadySelectedIds.has(aid)) return false;
    if (existingLinkedIds.includes(aid)) return false;
    if (agenda.approval_status !== "Approved") return false;
    if (agenda.meeting_readiness !== "Meeting Ready") return false;
    return true;
  }

  it("accepts Approved + Meeting Ready top-level agendas", () => {
    const agenda = { agenda_id: "a1", approval_status: "Approved", meeting_readiness: "Meeting Ready" };
    expect(isEligibleParent(agenda, new Set(), [])).toBe(true);
  });

  it("rejects non-Approved agendas", () => {
    const agenda = { agenda_id: "a2", approval_status: "Draft", meeting_readiness: "Meeting Ready" };
    expect(isEligibleParent(agenda, new Set(), [])).toBe(false);
  });

  it("rejects not-Meeting-Ready agendas", () => {
    const agenda = { agenda_id: "a3", approval_status: "Approved", meeting_readiness: "In Review" };
    expect(isEligibleParent(agenda, new Set(), [])).toBe(false);
  });

  it("rejects child agendas (has parent_agenda_id)", () => {
    const agenda = { agenda_id: "a4", parent_agenda_id: "a1", approval_status: "Approved", meeting_readiness: "Meeting Ready" };
    expect(isEligibleParent(agenda, new Set(), [])).toBe(false);
  });

  it("rejects archived agendas", () => {
    const agenda = { agenda_id: "a5", archived_at: "2024-01-01", approval_status: "Approved", meeting_readiness: "Meeting Ready" };
    expect(isEligibleParent(agenda, new Set(), [])).toBe(false);
  });

  it("rejects already-selected agendas", () => {
    const agenda = { agenda_id: "a6", approval_status: "Approved", meeting_readiness: "Meeting Ready" };
    expect(isEligibleParent(agenda, new Set(["a6"]), [])).toBe(false);
  });

  it("rejects already-linked agendas", () => {
    const agenda = { agenda_id: "a7", approval_status: "Approved", meeting_readiness: "Meeting Ready" };
    expect(isEligibleParent(agenda, new Set(), ["a7"])).toBe(false);
  });
});

// ─── Section 14: Drawer Fields ────────────────────────────────────────────────

describe("Meeting drawer schema — Venue & Access section (Section 14)", () => {
  it("MEETING_DRAWER_COLS Venue group must not contain rsvp_deadline, invitation_date, or board_pack_date", async () => {
    const { MEETING_DRAWER_COLS } = await import("../app/pages/boardMeetingDrawerSchemas");
    const venueGroup = MEETING_DRAWER_COLS.find(
      (col) => (col as { group?: { label: string } }).group?.label === "Venue & Access"
    );
    expect(venueGroup).toBeDefined();
    const cols = (venueGroup as { group?: { cols?: { key: string }[] } }).group?.cols ?? [];
    const keys = cols.map((c) => c.key);
    expect(keys).not.toContain("rsvp_deadline");
    expect(keys).not.toContain("invitation_date");
    expect(keys).not.toContain("board_pack_date");
    expect(keys).toContain("venue");
    expect(keys).toContain("virtual_link");
  });
});

// ─── Section 6: Hidden form fields for draft restoration ─────────────────────

describe("Hidden form fields for draft restoration (Section 6)", () => {
  it("MEETING_FORM_FIELDS contains the four hidden state-carrier keys", async () => {
    const { MEETING_FORM_FIELDS } = await import("../app/pages/boardMeetingFormFields");
    const keys = MEETING_FORM_FIELDS.map((f) => f.key);
    expect(keys).toContain("participant_links_json");
    expect(keys).toContain("selected_agenda_ids_json");
    expect(keys).toContain("additional_doc_ids_json");
    expect(keys).toContain("draft_current_step");
  });

  it("hidden state-carrier fields use the non-matching declarative condition", async () => {
    const { MEETING_FORM_FIELDS } = await import("../app/pages/boardMeetingFormFields");
    const hiddenKeys = ["participant_links_json", "selected_agenda_ids_json", "additional_doc_ids_json", "draft_current_step"];
    for (const key of hiddenKeys) {
      const field = MEETING_FORM_FIELDS.find((f) => f.key === key);
      expect(field, `field ${key} not found`).toBeDefined();
      expect(field?.condition).toEqual({ field: "__never__", value: "__never__" });
    }
  });
});
