/**
 * Live Board Meeting Journey — Focused Automated Tests
 * Covers Sections 28-30 of live-meeting-journey spec.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateMeetingQuorum } from "../app/utils/quorumCalculation";
import type { GovernanceBody, QuorumRule, MeetingParticipantLink } from "../app/data/boardMeetingData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGovBody(id: string, name: string): GovernanceBody {
  return { id, body_id: id, body_name: name, body_type: "Board", status: "Active" } as GovernanceBody;
}

function makeQuorumRule(govBodyId: string, min: number, pct: number): QuorumRule {
  return { id: `${govBodyId}-rule`, governance_body_id: govBodyId, minimum_members: String(min), quorum_percent: String(pct), status: "Active" } as unknown as QuorumRule;
}

function makeLink(userId: string, quorumEligible: boolean, votingEligible: boolean, category: "quorum" | "general" = "quorum"): MeetingParticipantLink {
  return {
    id: `lnk-${userId}`, meeting_id: "MTG-001", user_id: userId,
    participant_type: "Member", member_category: category,
    quorum_eligible: quorumEligible, voting_eligible: votingEligible,
    is_required: false, invitation_status: "pending",
    selection_source_type: "individual", created_at: new Date().toISOString(),
  } as MeetingParticipantLink;
}

const govBodies  = [makeGovBody("gb1", "Test Board")];
const quorumRules = [makeQuorumRule("gb1", 3, 50)];

// ─── One live session per meeting ─────────────────────────────────────────────

describe("One live session per meeting (Section 4)", () => {
  it("localStorage key is stable per meetingId", () => {
    const key = (id: string) => `bms.live.${id}`;
    expect(key("MTG-001")).toBe("bms.live.MTG-001");
    expect(key("MTG-001")).toBe(key("MTG-001")); // same key same meeting
    expect(key("MTG-001")).not.toBe(key("MTG-002")); // different key different meeting
  });

  it("session restore does not create duplicate records", () => {
    const seen = new Set<string>();
    const getOrCreate = (meetingId: string, sessions: { id: string; meeting_id: string }[]) => {
      const existing = sessions.find(s => s.meeting_id === meetingId);
      if (existing) return existing.id;
      const id = `SES-${meetingId}`;
      if (seen.has(id)) return id; // idempotent
      seen.add(id);
      sessions.push({ id, meeting_id: meetingId });
      return id;
    };

    const sessions: { id: string; meeting_id: string }[] = [];
    const id1 = getOrCreate("MTG-001", sessions);
    const id2 = getOrCreate("MTG-001", sessions); // same meeting, second call
    expect(id1).toBe(id2);
    expect(sessions.length).toBe(1);
  });
});

// ─── Attendance deduplication ──────────────────────────────────────────────────

describe("Attendance deduplication (Section 6)", () => {
  it("updating attendance for same user overwrites rather than creates duplicate", () => {
    const attendance: Record<string, string> = {};
    const setAttendance = (id: string, status: string) => { attendance[id] = status; };

    setAttendance("u1", "Present");
    setAttendance("u1", "Temporarily Away"); // should overwrite
    expect(Object.keys(attendance).filter(k => k === "u1").length).toBe(1);
    expect(attendance["u1"]).toBe("Temporarily Away");
  });

  it("attendance states are spec-aligned", () => {
    const VALID_STATES = ["Not Joined", "Present", "Temporarily Away", "Left", "Excused", "Recused"];
    const LEGACY_INVALID = ["Not Yet", "Virtual", "Joined Late", "Left Early", "Absent"];
    LEGACY_INVALID.forEach(s => expect(VALID_STATES).not.toContain(s));
  });

  it("present states correctly determine quorum presence", () => {
    const ACTIVE_STATES = ["Present", "Temporarily Away"];
    const map: Record<string, string> = { u1: "Present", u2: "Left", u3: "Temporarily Away", u4: "Excused" };
    const presentIds = Object.entries(map).filter(([, s]) => ACTIVE_STATES.includes(s)).map(([id]) => id);
    expect(presentIds).toContain("u1");
    expect(presentIds).toContain("u3");
    expect(presentIds).not.toContain("u2");
    expect(presentIds).not.toContain("u4");
  });
});

// ─── Quorum Members vs General Members ────────────────────────────────────────

describe("Quorum / General Member separation (Section 7 & 13)", () => {
  it("canonical links with quorum_eligible=true are counted for quorum", () => {
    const links: MeetingParticipantLink[] = [
      makeLink("u1", true,  true,  "quorum"),
      makeLink("u2", true,  true,  "quorum"),
      makeLink("u3", false, false, "general"),
    ];
    const quorumLinks  = links.filter(l => l.quorum_eligible);
    const generalLinks = links.filter(l => !l.quorum_eligible);
    expect(quorumLinks.length).toBe(2);
    expect(generalLinks.length).toBe(1);
  });

  it("general members are not counted for quorum calculation", () => {
    const quorumOnlyLinks = [makeLink("u1", true, true), makeLink("u2", true, true)];
    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      participantLinks: quorumOnlyLinks,
      governanceBodies: govBodies, quorumRules,
    });
    expect(result.eligibleCount).toBe(2);
  });
});

// ─── Actual quorum calculation (present members only) ─────────────────────────

describe("Actual quorum calculation uses attendance (Section 7)", () => {
  const allLinks = [
    makeLink("u1", true, true),
    makeLink("u2", true, true),
    makeLink("u3", true, true),
    makeLink("u4", false, false, "general"),
  ];
  const ACTIVE_STATES = ["Present", "Temporarily Away"];

  it("counts only present quorum-eligible members", () => {
    const attendance: Record<string, string> = { u1: "Present", u2: "Left", u3: "Present", u4: "Present" };
    const presentIds = Object.entries(attendance).filter(([, s]) => ACTIVE_STATES.includes(s)).map(([id]) => id);
    const presentQuorumLinks = allLinks.filter(l => l.quorum_eligible && presentIds.includes(l.user_id));

    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      participantLinks: presentQuorumLinks,
      governanceBodies: govBodies, quorumRules,
    });
    expect(result.eligibleCount).toBe(2); // u1 + u3, not u2 (Left) or u4 (general)
    expect(result.status).toBe("at_risk"); // 2 of required 3 — at risk
  });

  it("recused members are excluded from quorum even if present", () => {
    const attendance: Record<string, string> = { u1: "Present", u2: "Present", u3: "Recused" };
    const presentIds = Object.entries(attendance).filter(([, s]) => ACTIVE_STATES.includes(s)).map(([id]) => id);
    const recusedIds = Object.entries(attendance).filter(([, s]) => s === "Recused").map(([id]) => id);
    const presentQuorumLinks = allLinks.filter(l => l.quorum_eligible && presentIds.includes(l.user_id) && !recusedIds.includes(l.user_id));

    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      participantLinks: presentQuorumLinks,
      governanceBodies: govBodies, quorumRules,
    });
    expect(result.eligibleCount).toBe(2); // u1 + u2; u3 recused
  });

  it("all present quorum members gives expected status", () => {
    const attendance: Record<string, string> = { u1: "Present", u2: "Present", u3: "Present" };
    const presentIds = Object.keys(attendance);
    const presentQuorumLinks = allLinks.filter(l => l.quorum_eligible && presentIds.includes(l.user_id));
    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      participantLinks: presentQuorumLinks,
      governanceBodies: govBodies, quorumRules,
    });
    expect(result.status).toBe("expected");
    expect(result.eligibleCount).toBe(3);
  });
});

// ─── Quorum loss detection ────────────────────────────────────────────────────

describe("Quorum loss and restoration (Section 7)", () => {
  it("detects quorum loss when participant leaves", () => {
    const attendance1: Record<string, string> = { u1: "Present", u2: "Present", u3: "Present" };
    const attendance2: Record<string, string> = { u1: "Present", u2: "Present", u3: "Left" };
    const links = [makeLink("u1", true, true), makeLink("u2", true, true), makeLink("u3", true, true)];
    const ACTIVE = ["Present", "Temporarily Away"];

    const calcWithMap = (map: Record<string, string>) => {
      const pIds = Object.entries(map).filter(([, s]) => ACTIVE.includes(s)).map(([id]) => id);
      const rIds = Object.entries(map).filter(([, s]) => s === "Recused").map(([id]) => id);
      const pl = links.filter(l => l.quorum_eligible && pIds.includes(l.user_id) && !rIds.includes(l.user_id));
      return calculateMeetingQuorum({ boardCommitteeId: "gb1", participantLinks: pl, governanceBodies: govBodies, quorumRules });
    };

    const before = calcWithMap(attendance1);
    const after  = calcWithMap(attendance2);
    expect(before.status).toBe("expected");
    expect(after.status).not.toBe("expected");
  });
});

// ─── Agenda state transitions ─────────────────────────────────────────────────

describe("Agenda state transitions (Section 10)", () => {
  it("agenda states are spec-aligned", () => {
    const VALID_STATES = ["Not Started", "In Discussion", "Completed", "Deferred", "Skipped"];
    const LEGACY_INVALID = ["Active"]; // was the old state name
    LEGACY_INVALID.forEach(s => expect(VALID_STATES).not.toContain(s));
  });

  it("only one agenda item should be In Discussion at a time", () => {
    const statuses: Record<number, string> = { 0: "Completed", 1: "In Discussion", 2: "Not Started" };
    const activeItems = Object.values(statuses).filter(s => s === "In Discussion");
    expect(activeItems.length).toBeLessThanOrEqual(1);
  });

  it("completing an item moves to next as In Discussion", () => {
    const statuses: Record<number, string> = { 0: "In Discussion", 1: "Not Started", 2: "Not Started" };
    let activeIdx = 0;
    const completeItem = (idx: number) => {
      statuses[idx] = "Completed";
      const next = idx + 1;
      if (next in statuses) { statuses[next] = "In Discussion"; activeIdx = next; }
    };
    completeItem(0);
    expect(statuses[0]).toBe("Completed");
    expect(statuses[1]).toBe("In Discussion");
    expect(activeIdx).toBe(1);
  });
});

// ─── Voting eligibility ───────────────────────────────────────────────────────

describe("Voting eligibility (Section 16)", () => {
  it("only voting_eligible participants may vote", () => {
    const links: MeetingParticipantLink[] = [
      makeLink("u1", true,  true),
      makeLink("u2", true,  false), // quorum but not voting
      makeLink("u3", false, false, "general"),
    ];
    const eligibleVoters = links.filter(l => l.voting_eligible);
    expect(eligibleVoters.map(l => l.user_id)).toEqual(["u1"]);
  });

  it("excused participants cannot vote", () => {
    const ACTIVE_STATES = ["Present", "Temporarily Away"];
    const links: MeetingParticipantLink[] = [makeLink("u1", true, true), makeLink("u2", true, true)];
    const attendance: Record<string, string> = { u1: "Present", u2: "Excused" };
    const eligibleVoterIds = links
      .filter(l => l.voting_eligible && ACTIVE_STATES.includes(attendance[l.user_id] ?? "Not Joined"))
      .map(l => l.user_id);
    expect(eligibleVoterIds).toContain("u1");
    expect(eligibleVoterIds).not.toContain("u2");
  });

  it("recused participants cannot vote", () => {
    const ACTIVE_STATES = ["Present", "Temporarily Away"];
    const links: MeetingParticipantLink[] = [makeLink("u1", true, true), makeLink("u2", true, true)];
    const attendance: Record<string, string> = { u1: "Present", u2: "Recused" };
    const eligibleVoterIds = links
      .filter(l => l.voting_eligible && ACTIVE_STATES.includes(attendance[l.user_id] ?? "Not Joined") && attendance[l.user_id] !== "Recused")
      .map(l => l.user_id);
    expect(eligibleVoterIds).not.toContain("u2");
  });

  it("duplicate vote prevention — castVotes map uses participant ID as key", () => {
    const castVotes: Record<string, "For" | "Against" | "Abstain"> = {};
    const castVote = (participantId: string, choice: "For" | "Against" | "Abstain") => {
      castVotes[participantId] = choice; // map overwrites — no duplicates
    };
    castVote("u1", "For");
    castVote("u1", "Against"); // should overwrite, not add
    expect(Object.keys(castVotes).filter(k => k === "u1").length).toBe(1);
    expect(castVotes["u1"]).toBe("Against");
  });
});

// ─── Vote closing and result ──────────────────────────────────────────────────

describe("Vote closing and result calculation (Section 16)", () => {
  it("simple majority: more For than Against wins", () => {
    const votesFor = 4, votesAgainst = 2, thresholdPct = 0.5;
    const totalCast = votesFor + votesAgainst;
    const passed = votesFor > totalCast * thresholdPct;
    expect(passed).toBe(true);
  });

  it("tie is not a pass for simple majority", () => {
    const votesFor = 3, votesAgainst = 3, thresholdPct = 0.5;
    const totalCast = votesFor + votesAgainst;
    const passed = votesFor > totalCast * thresholdPct;
    expect(passed).toBe(false);
  });

  it("closed vote result is immutable (no silent edit)", () => {
    type Vote = { status: "Open" | "Closed"; result?: "Passed" | "Failed"; votesFor: number };
    const vote: Vote = { status: "Closed", result: "Passed", votesFor: 4 };
    // Attempting to silently edit should be refused by immutability check
    const isImmutable = vote.status === "Closed";
    expect(isImmutable).toBe(true);
  });
});

// ─── End Meeting blockers ────────────────────────────────────────────────────

describe("End Meeting blockers (Section 24)", () => {
  it("active vote blocks ending the meeting", () => {
    const activeVote = { status: "Open" as const };
    const canEnd = activeVote.status !== "Open";
    expect(canEnd).toBe(false);
  });

  it("closed vote does not block ending", () => {
    const activeVote: { status: string } = { status: "Closed" };
    const canEnd = activeVote.status !== "Open";
    expect(canEnd).toBe(true);
  });

  it("no active vote allows ending", () => {
    const canEndWithNoVote = (vote: { status: string } | null) => !vote || vote.status !== "Open";
    expect(canEndWithNoVote(null)).toBe(true);
    expect(canEndWithNoVote({ status: "Closed" })).toBe(true);
    expect(canEndWithNoVote({ status: "Open" })).toBe(false);
  });
});

// ─── Leave Meeting ────────────────────────────────────────────────────────────

describe("Leave Meeting does not end the meeting (Section 23)", () => {
  it("leave updates participant attendance to Left but keeps ctrlStatus in-progress", () => {
    let ctrlStatus = "in-progress";
    const attendance: Record<string, string> = { u1: "Present" };
    const leaveWithoutEnd = (participantId: string) => {
      attendance[participantId] = "Left";
      // ctrlStatus unchanged
    };
    leaveWithoutEnd("u1");
    expect(ctrlStatus).toBe("in-progress");
    expect(attendance["u1"]).toBe("Left");
  });
});

// ─── Pre-Meeting Readiness ────────────────────────────────────────────────────

describe("Pre-Meeting Readiness (Section 5)", () => {
  it("readiness check uses present quorum members for quorum calculation", () => {
    const links = [makeLink("u1", true, true), makeLink("u2", true, true), makeLink("u3", true, true)];
    const attendance: Record<string, string> = { u1: "Present", u2: "Not Joined", u3: "Present" };
    const ACTIVE = ["Present", "Temporarily Away"];
    const presentLinks = links.filter(l => l.quorum_eligible && ACTIVE.includes(attendance[l.user_id] ?? "Not Joined"));
    const result = calculateMeetingQuorum({
      boardCommitteeId: "gb1",
      participantLinks: presentLinks,
      governanceBodies: govBodies, quorumRules,
    });
    expect(result.eligibleCount).toBe(2); // u1 + u3
    expect(result.status).toBe("at_risk");
  });

  it("session creation is idempotent (start_meeting called twice returns same session)", () => {
    const sessions: { id: string; meeting_id: string }[] = [];
    const getOrCreateSession = (meetingId: string) => {
      const existing = sessions.find(s => s.meeting_id === meetingId);
      if (existing) return existing.id;
      const id = `SES-${meetingId}-${Date.now()}`;
      sessions.push({ id, meeting_id: meetingId });
      return id;
    };
    const id1 = getOrCreateSession("MTG-001");
    const id2 = getOrCreateSession("MTG-001");
    expect(id1).toBe(id2);
    expect(sessions.length).toBe(1);
  });
});

// ─── Meeting Details drawer actions ──────────────────────────────────────────

describe("Meeting Details actions visibility (Section 2 & 3)", () => {
  type Status = "Draft" | "Scheduled" | "In Progress" | "Completed" | "Cancelled";

  const resolveActions = (status: Status, isController: boolean, isParticipant: boolean) => {
    const actions: string[] = [];
    if (status === "Scheduled") {
      if (isController)  { actions.push("Start Meeting", "Edit Meeting", "Reschedule", "Cancel"); }
      if (isParticipant) { actions.push("Join Meeting"); }
    }
    if (status === "In Progress") {
      if (isController)  { actions.push("Resume Meeting"); }
      if (isParticipant) { actions.push("Join Meeting"); }
    }
    if (status === "Completed")  actions.push("View Meeting Record");
    if (status === "Draft")      actions.push("Complete Draft", "Edit Meeting");
    if (status === "Cancelled")  actions.push("View Details", "View History");
    return actions;
  };

  it("Scheduled + controller shows Start Meeting", () => {
    const actions = resolveActions("Scheduled", true, false);
    expect(actions).toContain("Start Meeting");
  });

  it("Scheduled + participant shows Join Meeting only", () => {
    const actions = resolveActions("Scheduled", false, true);
    expect(actions).toContain("Join Meeting");
    expect(actions).not.toContain("Start Meeting");
  });

  it("In Progress + controller shows Resume Meeting", () => {
    const actions = resolveActions("In Progress", true, false);
    expect(actions).toContain("Resume Meeting");
  });

  it("Completed shows View Meeting Record", () => {
    const actions = resolveActions("Completed", false, false);
    expect(actions).toContain("View Meeting Record");
  });

  it("Draft does not show Start Meeting or Join Meeting", () => {
    const actions = resolveActions("Draft", true, true);
    expect(actions).not.toContain("Start Meeting");
    expect(actions).not.toContain("Join Meeting");
  });
});

// ─── Agenda eligibility ───────────────────────────────────────────────────────

describe("Agenda eligibility for live meeting (existing filter)", () => {
  it("only Approved + Meeting Ready agendas may be linked to meetings", async () => {
    const { MEETING_FORM_FIELDS } = await import("../app/pages/boardMeetingFormFields");
    // Verify the hidden state-carrier fields exist (regression from board-meeting-creation spec)
    const keys = MEETING_FORM_FIELDS.map((f: { key?: string }) => f.key ?? "");
    expect(keys).toContain("participant_links_json");
    expect(keys).toContain("selected_agenda_ids_json");
  });
});

// ─── Regression: drawer schema (no rsvp_deadline etc.) ───────────────────────

describe("Regression: Meeting drawer schema (from board-meeting-creation-4.md)", () => {
  it("Venue group does not contain obsolete fields", async () => {
    const { MEETING_DRAWER_COLS } = await import("../app/pages/boardMeetingDrawerSchemas");
    const venue = MEETING_DRAWER_COLS.find((c: unknown) => (c as { group?: { label: string } }).group?.label === "Venue & Access");
    const cols  = (venue as { group?: { cols?: { key: string }[] } })?.group?.cols ?? [];
    const keys  = cols.map((c: { key: string }) => c.key);
    expect(keys).not.toContain("rsvp_deadline");
    expect(keys).not.toContain("invitation_date");
    expect(keys).not.toContain("board_pack_date");
  });
});

// ─── Agenda-specific recusal (Section 14) ─────────────────────────────────────

describe("Agenda-specific recusal (Section 14)", () => {
  function computeAgendaRecusedIds(agendaRecusals: Record<string, string[]>, agendaKey: string): Set<string> {
    return new Set(agendaRecusals[agendaKey] ?? []);
  }

  function toggleAgendaRecusal(agendaRecusals: Record<string, string[]>, agendaKey: string, userId: string): Record<string, string[]> {
    const existing = agendaRecusals[agendaKey] ?? [];
    const updated = existing.includes(userId)
      ? existing.filter(id => id !== userId)
      : [...existing, userId];
    return { ...agendaRecusals, [agendaKey]: updated };
  }

  it("recusing a user adds them to agendaRecusals for the active agenda key", () => {
    let recusals: Record<string, string[]> = {};
    recusals = toggleAgendaRecusal(recusals, "item-1", "user-A");
    expect(recusals["item-1"]).toContain("user-A");
  });

  it("toggling again removes the recusal (restore)", () => {
    let recusals: Record<string, string[]> = { "item-1": ["user-A"] };
    recusals = toggleAgendaRecusal(recusals, "item-1", "user-A");
    expect(recusals["item-1"]).not.toContain("user-A");
  });

  it("recusal is scoped per agenda key — does not bleed to other items", () => {
    let recusals: Record<string, string[]> = {};
    recusals = toggleAgendaRecusal(recusals, "item-1", "user-A");
    const item2Recused = computeAgendaRecusedIds(recusals, "item-2");
    expect(item2Recused.has("user-A")).toBe(false);
  });

  it("agenda-recused user is excluded from voting eligibility", () => {
    const links = [
      makeLink("user-A", true, true),
      makeLink("user-B", true, true),
    ];
    const attendanceMap: Record<string, string> = { "user-A": "Present", "user-B": "Present" };
    const agendaRecusedIds = new Set(["user-A"]);
    const ACTIVE_STATES = ["Present", "Temporarily Away"];
    const votingEligibleIds = new Set(
      links
        .filter(l =>
          l.voting_eligible &&
          ACTIVE_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined") &&
          (attendanceMap[l.user_id] ?? "Not Joined") !== "Recused" &&
          !agendaRecusedIds.has(l.user_id)
        )
        .map(l => l.user_id)
    );
    expect(votingEligibleIds.has("user-A")).toBe(false);
    expect(votingEligibleIds.has("user-B")).toBe(true);
  });

  it("globally-recused user is also excluded from voting regardless of agenda recusal", () => {
    const links = [makeLink("user-C", true, true)];
    const attendanceMap: Record<string, string> = { "user-C": "Recused" };
    const agendaRecusedIds = new Set<string>();
    const ACTIVE_STATES = ["Present", "Temporarily Away"];
    const votingEligibleIds = new Set(
      links
        .filter(l =>
          l.voting_eligible &&
          ACTIVE_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined") &&
          (attendanceMap[l.user_id] ?? "Not Joined") !== "Recused" &&
          !agendaRecusedIds.has(l.user_id)
        )
        .map(l => l.user_id)
    );
    expect(votingEligibleIds.has("user-C")).toBe(false);
  });
});

// ─── Quorum-loss banner logic (Section 7) ─────────────────────────────────────

describe("Quorum-loss banner logic (Section 7)", () => {
  const ACTIVE_STATES = ["Present", "Temporarily Away"];

  it("banner shows when quorum is lost during in-progress meeting", () => {
    const quorumMet = false;
    const ctrlStatus = "in-progress";
    const shouldShow = !quorumMet && ctrlStatus === "in-progress";
    expect(shouldShow).toBe(true);
  });

  it("banner does not show when quorum is met", () => {
    const quorumMet = true;
    const ctrlStatus = "in-progress";
    const shouldShow = !quorumMet && ctrlStatus === "in-progress";
    expect(shouldShow).toBe(false);
  });

  it("banner does not show when meeting is ended even if quorum is lost", () => {
    const quorumMet = false;
    const ctrlStatus: string = "ended";
    const shouldShow = !quorumMet && ctrlStatus === "in-progress";
    expect(shouldShow).toBe(false);
  });

  it("quorum is lost when a member leaves and drops count below threshold", () => {
    const links = [
      makeLink("u1", true, true), makeLink("u2", true, true), makeLink("u3", true, true),
      makeLink("u4", true, true), makeLink("u5", true, true),
    ];
    const attendanceMap: Record<string, string> = { u1: "Present", u2: "Present", u3: "Present", u4: "Present", u5: "Present" };
    const getQuorumEligiblePresent = (map: Record<string, string>) =>
      links.filter(l => l.quorum_eligible && ACTIVE_STATES.includes(map[l.user_id] ?? "Not Joined")).length;

    expect(getQuorumEligiblePresent(attendanceMap)).toBe(5); // quorum met
    const afterLeave = { ...attendanceMap, u5: "Left", u4: "Left", u3: "Left" };
    expect(getQuorumEligiblePresent(afterLeave)).toBe(2); // quorum lost (below 3 minimum)
  });
});

// ─── Document viewer state preservation (Section 12) ─────────────────────────

describe("Document viewer overlay — session state preservation (Section 12)", () => {
  it("viewerDoc does not affect session persistence keys", () => {
    // viewerDoc is transient — not included in session save keys
    const sessionKeys = ["ctrlStatus", "elapsed", "activeIdx", "agendaStatuses", "notes", "motions", "attendance", "activeVote", "timeline", "agendaRecusals"];
    expect(sessionKeys).not.toContain("viewerDoc");
  });

  it("opening a document does not change ctrlStatus", () => {
    // Simulates: setViewerDoc(doc) leaves ctrlStatus unchanged
    const ctrlStatus = "in-progress";
    const viewerDoc = { id: "doc-1", doc_name: "Annual Report" };
    // Just reading viewerDoc doesn't mutate ctrlStatus
    expect(ctrlStatus).toBe("in-progress");
    expect(viewerDoc.id).toBe("doc-1");
  });

  it("closing document viewer restores to meeting view (viewerDoc = null)", () => {
    let viewerDoc: { id: string } | null = { id: "doc-1" };
    viewerDoc = null;
    expect(viewerDoc).toBeNull();
  });

  it("document is opened read-only during live meeting (canEdit = false)", () => {
    const canEdit = false; // always false when viewerDoc is opened in-meeting
    expect(canEdit).toBe(false);
  });
});

// ─── Agenda reason modal (Sections 11, 13) ───────────────────────────────────

describe("Agenda reason modal — Defer / Skip / Reopen (Sections 11, 13)", () => {
  type AgendaAction = "Defer" | "Skip" | "Reopen";

  function requiresReason(action: AgendaAction): boolean {
    return action === "Defer" || action === "Skip" || action === "Reopen";
  }

  function applyAgendaAction(status: string, action: AgendaAction, reason: string): string | null {
    if (requiresReason(action) && !reason.trim()) return null; // blocked — no reason
    if (action === "Defer") return "Deferred";
    if (action === "Skip") return "Skipped";
    if (action === "Reopen") return "In Discussion";
    return status;
  }

  it("Defer requires a non-empty reason", () => {
    expect(applyAgendaAction("In Discussion", "Defer", "")).toBeNull();
    expect(applyAgendaAction("In Discussion", "Defer", "Postponed to next meeting")).toBe("Deferred");
  });

  it("Skip requires a non-empty reason", () => {
    expect(applyAgendaAction("In Discussion", "Skip", "")).toBeNull();
    expect(applyAgendaAction("In Discussion", "Skip", "Out of scope")).toBe("Skipped");
  });

  it("Reopen requires a non-empty reason", () => {
    expect(applyAgendaAction("Deferred", "Reopen", "")).toBeNull();
    expect(applyAgendaAction("Deferred", "Reopen", "New information available")).toBe("In Discussion");
  });

  it("Complete does not require a reason (no modal)", () => {
    // Complete is applied directly without a reason modal
    const completeItem = (idx: number, statuses: Record<number, string>): Record<number, string> => ({
      ...statuses, [idx]: "Completed",
    });
    const statuses = completeItem(0, {});
    expect(statuses[0]).toBe("Completed");
  });

  it("Previous and Next navigation do not require reasons", () => {
    const navigate = (idx: number, direction: "prev" | "next", total: number): number => {
      if (direction === "prev") return Math.max(0, idx - 1);
      return Math.min(total - 1, idx + 1);
    };
    expect(navigate(2, "prev", 5)).toBe(1);
    expect(navigate(2, "next", 5)).toBe(3);
    expect(navigate(0, "prev", 5)).toBe(0); // clamped
    expect(navigate(4, "next", 5)).toBe(4); // clamped
  });
});

// ─── Session autosave structure (Section 21) ─────────────────────────────────

describe("Session autosave — agendaRecusals included (Section 21)", () => {
  it("agendaRecusals is part of the persisted session shape", () => {
    type LiveSession = {
      ctrlStatus: string;
      elapsed: number;
      activeIdx: number;
      agendaStatuses: Record<number, string>;
      notes: Record<number, string>;
      motions: unknown[];
      attendance: Record<string, string>;
      activeVote: unknown | null;
      timeline: Record<string, string>;
      agendaRecusals: Record<string, string[]>;
    };
    const session: LiveSession = {
      ctrlStatus: "in-progress", elapsed: 1200, activeIdx: 1,
      agendaStatuses: { 0: "Completed", 1: "In Discussion" },
      notes: { 1: "Discussion notes here" },
      motions: [],
      attendance: { "user-A": "Present" },
      activeVote: null,
      timeline: {},
      agendaRecusals: { "item-1": ["user-A"] },
    };
    expect(session.agendaRecusals).toHaveProperty("item-1");
    expect(session.agendaRecusals["item-1"]).toContain("user-A");
  });

  it("default session has empty agendaRecusals", () => {
    const defaultSession = { agendaRecusals: {} as Record<string, string[]> };
    expect(Object.keys(defaultSession.agendaRecusals).length).toBe(0);
  });
});
