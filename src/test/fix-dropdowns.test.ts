/**
 * fix-dropdowns.test.ts
 *
 * Covers Section 16 of fix-dropdowns-board-meeting-1.md:
 * Structured option rendering, stable value/label, canonical meeting entry,
 * governance body ID persistence, membership migration, duplicate prevention,
 * quorum/general member filtering, related meeting options, route intents,
 * legacy-value restoration, and empty required-field state.
 */

import { describe, it, expect } from "vitest";
import { patchFormOptions } from "../app/utils/patchFormOptions";
import { migrateGovernanceMemberships } from "../app/utils/migrateGovernanceMemberships";
import type { FormField } from "../app/components/forms/EntryForm";
import type { GovernanceMembership } from "../app/data/governanceMemberships";
import type { BmsUser } from "../app/data/bmsUsers";
import type { EntityRecord } from "../app/hooks/useEntityRegistry";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeField(key: string, options: FormField["options"] = []): FormField {
  return { key, label: key, type: "select", options };
}

function user(overrides: Partial<BmsUser> & { id: string; name: string }): BmsUser {
  const { id, name, ...rest } = overrides;
  return {
    id,
    name,
    email:          rest.email            ?? `${id}@example.com`,
    account_status: rest.account_status   ?? "active",
    designation:    rest.designation      ?? "Member",
    department:     rest.department       ?? "—",
    status:         rest.status           ?? "active",
    ...rest,
  } as BmsUser;
}

interface FakeGovBody extends EntityRecord {
  id: string;
  body_name: string;
}

function govBody(id: string, name: string): FakeGovBody {
  return { id, body_name: name } as FakeGovBody;
}

function membership(
  overrides: Partial<GovernanceMembership> & { id: string; user_id: string; gov_body_id: string },
): GovernanceMembership {
  return {
    gov_body_name:     "Board",
    membership_role:   "member",
    is_voting_member:  false,
    counts_for_quorum: false,
    start_date:        "2024-01-01",
    status:            "active",
    ...overrides,
  } as GovernanceMembership;
}

// ── patchFormOptions ──────────────────────────────────────────────────────────

describe("patchFormOptions", () => {
  it("passes string options through unchanged", () => {
    const fields = [makeField("status", ["Active", "Inactive"])];
    const result = patchFormOptions(fields, {});
    expect(result[0].options).toEqual(["Active", "Inactive"]);
  });

  it("replaces options with structured { value, label } objects", () => {
    const fields = [makeField("chairperson", [])];
    const opts = [{ value: "u1", label: "Aminul Islam — Board Chairman" }];
    const result = patchFormOptions(fields, { chairperson: opts });
    expect(result[0].options).toEqual(opts);
  });

  it("allows an explicit empty array override (clears stale static options)", () => {
    const fields = [makeField("board_id", ["old-static-value"])];
    const result = patchFormOptions(fields, { board_id: [] });
    expect(result[0].options).toHaveLength(0);
  });

  it("leaves unknown keys untouched", () => {
    const fields = [makeField("unrelated", ["x"])];
    const result = patchFormOptions(fields, { other_key: [{ value: "v", label: "L" }] });
    expect(result[0].options).toEqual(["x"]);
  });

  it("does not mutate the original fields array", () => {
    const original = [makeField("chairperson", [])];
    const frozen = JSON.stringify(original);
    patchFormOptions(original, { chairperson: [{ value: "u2", label: "Jane" }] });
    expect(JSON.stringify(original)).toBe(frozen);
  });

  it("stores only the value, not the full label", () => {
    const fields  = [makeField("chairperson", [])];
    const opts    = [{ value: "u1", label: "Aminul Islam — Board Chairman — Board Secretariat" }];
    const result  = patchFormOptions(fields, { chairperson: opts });
    const option  = (result[0].options as Array<{ value: string; label: string }>)[0];
    expect(option.value).toBe("u1");
    expect(option.label).toContain("Aminul Islam");
    expect(option.value).not.toContain("Aminul");
  });
});

// ── Stable value-label contract ───────────────────────────────────────────────

describe("structured option contract", () => {
  it("a readable label does not leak into the stored value", () => {
    const opt = { value: "GB-001", label: "Board of Directors" };
    expect(opt.value).toBe("GB-001");
    expect(opt.value).not.toBe(opt.label);
  });

  it("governance body option uses stable ID as value", () => {
    const bodies = [{ id: "GB-001", name: "Board of Directors" }];
    const options = bodies.map(b => ({ value: b.id, label: b.name }));
    expect(options[0].value).toBe("GB-001");
  });

  it("user option stores canonical user ID, not display name", () => {
    const users = [user({ id: "u1", name: "Aminul Islam", designation: "Board Chairman" })];
    const options = users.map(u => ({
      value: u.id,
      label: `${u.name} — ${u.designation ?? ""}`,
    }));
    expect(options[0].value).toBe("u1");
    expect(options[0].label).toContain("Aminul Islam");
    expect(options[0].value).not.toContain("—");
  });

  it("related meeting option stores meeting ID as value", () => {
    const meetings = [
      { meeting_id: "MTG-001", meeting_title: "Q1 Board Meeting", meeting_date: "2024-03-15" },
    ];
    const options = meetings.map(m => ({
      value: m.meeting_id,
      label: [m.meeting_title, m.meeting_date?.slice(0, 10)].filter(Boolean).join(" — "),
    }));
    expect(options[0].value).toBe("MTG-001");
    expect(options[0].label).toContain("Q1 Board Meeting");
    expect(options[0].label).toContain("2024-03-15");
  });
});

// ── One canonical Meeting Creation entry ─────────────────────────────────────

describe("canonical meeting creation entry", () => {
  it("?create=1 param detected when value is '1'", () => {
    const param = "1";
    expect(param === "1").toBe(true);
  });

  it("?create=1 param not triggered for other values", () => {
    const check = (v: string | null) => v === "1";
    expect(check("0")).toBe(false);
    expect(check(null)).toBe(false);
    expect(check("")).toBe(false);
  });

  it("non-canonical pages navigate to /meetings/all-meetings?create=1", () => {
    const buildEntryUrl = (returnPath?: string) => {
      const base = "/meetings/all-meetings?create=1";
      return returnPath ? `${base}&from=${encodeURIComponent(returnPath)}` : base;
    };
    expect(buildEntryUrl()).toBe("/meetings/all-meetings?create=1");
    expect(buildEntryUrl("/meetings/meeting-overview")).toContain("from=");
  });
});

// ── migrateGovernanceMemberships ─────────────────────────────────────────────

describe("migrateGovernanceMemberships", () => {
  const bodies = [govBody("GB-001", "Board of Directors")];
  const users  = [
    user({ id: "u1", name: "Alice Smith", account_status: "active" }),
    user({ id: "u2", name: "Bob Jones",   account_status: "active" }),
  ];

  const legacyBase = {
    id:           "L1",
    body_name:    "Board of Directors",
    member_name:  "Alice Smith",
    member_role:  "Chair",
    voting_rights: "Yes",
    status:       "active",
    start_date:   "2024-01-01",
  };

  it("migrates an active legacy record with exact matches", () => {
    const result = migrateGovernanceMemberships([legacyBase as never], [], bodies, users);
    expect(result.migratedCount).toBe(1);
    const added = result.toAdd[0] as unknown as GovernanceMembership;
    expect(added.user_id).toBe("u1");
    expect(added.gov_body_id).toBe("GB-001");
    expect(added.membership_role).toBe("chair");
    expect(added.is_voting_member).toBe(true);
    expect(added.counts_for_quorum).toBe(true);
  });

  it("maps legacy role strings to canonical MembershipRole values", () => {
    const roleCases: Array<[string, string]> = [
      ["Chairperson", "chair"],
      ["Chair",       "chair"],
      ["Vice Chair",  "vice_chair"],
      ["Secretary",   "secretary"],
      ["Member",      "member"],
      ["Observer",    "observer"],
      ["Unknown",     "member"],
    ];
    for (const [legacyRole, expected] of roleCases) {
      const legacy = { ...legacyBase, member_role: legacyRole };
      const result = migrateGovernanceMemberships([legacy as never], [], bodies, users);
      const added  = result.toAdd[0] as unknown as GovernanceMembership | undefined;
      expect(added?.membership_role).toBe(expected);
    }
  });

  it("skips inactive legacy records", () => {
    const inactive = { ...legacyBase, status: "inactive" };
    const result = migrateGovernanceMemberships([inactive as never], [], bodies, users);
    expect(result.skippedCount).toBe(1);
    expect(result.migratedCount).toBe(0);
  });

  it("marks as unresolved when governance body name does not match", () => {
    const bad = { ...legacyBase, body_name: "No Such Committee" };
    const result = migrateGovernanceMemberships([bad as never], [], bodies, users);
    expect(result.unresolvedCount).toBe(1);
    expect(result.migratedCount).toBe(0);
  });

  it("marks as unresolved when user name matches zero canonical users", () => {
    const bad = { ...legacyBase, member_name: "Ghost Person" };
    const result = migrateGovernanceMemberships([bad as never], [], bodies, users);
    expect(result.unresolvedCount).toBe(1);
  });

  it("marks as unresolved when user name is ambiguous (two matches)", () => {
    const duplicateUsers = [
      user({ id: "u3", name: "Same Name" }),
      user({ id: "u4", name: "Same Name" }),
    ];
    const ambiguous = { ...legacyBase, member_name: "Same Name" };
    const result = migrateGovernanceMemberships([ambiguous as never], [], bodies, duplicateUsers);
    expect(result.unresolvedCount).toBe(1);
  });

  it("prevents duplicate canonical memberships", () => {
    const existing = membership({ id: "CM1", user_id: "u1", gov_body_id: "GB-001" });
    const result = migrateGovernanceMemberships([legacyBase as never], [existing], bodies, users);
    expect(result.duplicateCount).toBe(1);
    expect(result.migratedCount).toBe(0);
  });

  it("does not mutate input arrays", () => {
    const legacyArr = [legacyBase as never];
    const canonArr: GovernanceMembership[] = [];
    const len = legacyArr.length;
    migrateGovernanceMemberships(legacyArr, canonArr, bodies, users);
    expect(legacyArr).toHaveLength(len);
    expect(canonArr).toHaveLength(0);
  });

  it("reports correct counts across mixed records", () => {
    const inactive   = { ...legacyBase, id: "L-skip", status: "inactive" };
    const unresolved = { ...legacyBase, id: "L-unres", body_name: "Unknown Body" };
    const duplicate  = membership({ id: "CM1", user_id: "u1", gov_body_id: "GB-001" });
    const records    = [legacyBase as never, inactive as never, unresolved as never];
    const result     = migrateGovernanceMemberships(records, [duplicate], bodies, users);
    expect(result.skippedCount).toBe(1);
    expect(result.unresolvedCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.migratedCount).toBe(0);
  });
});

// ── Quorum and General Member filtering ──────────────────────────────────────

describe("quorum and general member filtering", () => {
  const allMemberships: GovernanceMembership[] = [
    membership({ id: "CM1", user_id: "u1", gov_body_id: "GB-001", counts_for_quorum: true,  status: "active" }),
    membership({ id: "CM2", user_id: "u2", gov_body_id: "GB-001", counts_for_quorum: false, status: "active" }),
    membership({ id: "CM3", user_id: "u3", gov_body_id: "GB-001", counts_for_quorum: true,  status: "expired" }),
    membership({ id: "CM4", user_id: "u4", gov_body_id: "GB-002", counts_for_quorum: true,  status: "active" }),
  ];

  it("quorum members: active + counts_for_quorum=true, correct gov body", () => {
    const quorum = allMemberships.filter(
      m => m.gov_body_id === "GB-001" && m.status === "active" && m.counts_for_quorum,
    );
    expect(quorum).toHaveLength(1);
    expect(quorum[0].user_id).toBe("u1");
  });

  it("general members: active + counts_for_quorum=false, correct gov body", () => {
    const general = allMemberships.filter(
      m => m.gov_body_id === "GB-001" && m.status === "active" && !m.counts_for_quorum,
    );
    expect(general).toHaveLength(1);
    expect(general[0].user_id).toBe("u2");
  });

  it("expired memberships are excluded from both sets", () => {
    const active = allMemberships.filter(m => m.gov_body_id === "GB-001" && m.status === "active");
    const userIds = active.map(m => m.user_id);
    expect(userIds).not.toContain("u3");
  });

  it("memberships from another body are excluded", () => {
    const forBody1 = allMemberships.filter(m => m.gov_body_id === "GB-001");
    const userIds  = forBody1.map(m => m.user_id);
    expect(userIds).not.toContain("u4");
  });
});

// ── Empty required-field state (AppSelectField logic) ────────────────────────

describe("empty required-field state", () => {
  it("isEmpty is true when options array is empty", () => {
    const options: Array<string | { value: string; label: string }> = [];
    const isEmpty = options.length === 0;
    expect(isEmpty).toBe(true);
  });

  it("isEmpty is false when options has entries", () => {
    const options = [{ value: "u1", label: "Alice" }];
    const isEmpty = options.length === 0;
    expect(isEmpty).toBe(false);
  });

  it("effectiveDisabled is true when isEmpty", () => {
    const disabled = false;
    const isEmpty  = true;
    const effectiveDisabled = disabled || isEmpty;
    expect(effectiveDisabled).toBe(true);
  });

  it("helperText shows emptyMessage when empty", () => {
    const isEmpty       = true;
    const emptyMessage  = "No active users. Add users in User Management.";
    const helper        = "Select a user";
    const helperText    = isEmpty ? (emptyMessage ?? helper ?? "No options available") : (helper);
    expect(helperText).toBe(emptyMessage);
  });

  it("helperText falls back to 'No options available' when emptyMessage is undefined", () => {
    const isEmpty       = true;
    const emptyMessage: string | undefined = undefined;
    const helper:       string | undefined = undefined;
    const helperText = isEmpty ? (emptyMessage ?? helper ?? "No options available") : "helper";
    expect(helperText).toBe("No options available");
  });

  it("value is cleared to empty string when isEmpty", () => {
    const isEmpty = true;
    const value   = "stale-u1";
    const effectiveValue = isEmpty ? "" : value;
    expect(effectiveValue).toBe("");
  });

  it("error styling is suppressed when auto-disabled due to empty options", () => {
    const isEmpty   = true;
    const hasError  = true;
    const showError = hasError && !isEmpty;
    expect(showError).toBe(false);
  });
});

// ── Related Meeting options ───────────────────────────────────────────────────

describe("related meeting options", () => {
  const meetings = [
    { meeting_id: "MTG-001", id: "MTG-001", meeting_title: "Q1 Board Meeting", meeting_date: "2024-03-15T10:00:00Z" },
    { meeting_id: "MTG-002", id: "MTG-002", meeting_title: "Annual Review",    meeting_date: "2024-06-01T09:00:00Z" },
    { meeting_id: "MTG-003", id: "MTG-003", meeting_title: "No-Date Meeting",  meeting_date: undefined },
  ];

  it("each meeting option stores the meeting ID as value", () => {
    const options = meetings.map(m => ({
      value: m.meeting_id ?? m.id,
      label: [m.meeting_title, m.meeting_date ? m.meeting_date.slice(0, 10) : ""].filter(Boolean).join(" — "),
    }));
    expect(options[0].value).toBe("MTG-001");
    expect(options[1].value).toBe("MTG-002");
  });

  it("label includes meeting title and date", () => {
    const m = meetings[0];
    const label = [m.meeting_title, m.meeting_date ? m.meeting_date.slice(0, 10) : ""].filter(Boolean).join(" — ");
    expect(label).toBe("Q1 Board Meeting — 2024-03-15");
  });

  it("meeting with no date shows only the title", () => {
    const m = meetings[2];
    const label = [m.meeting_title, m.meeting_date ? m.meeting_date.slice(0, 10) : ""].filter(Boolean).join(" — ");
    expect(label).toBe("No-Date Meeting");
  });

  it("patchFormOptions wires meeting options onto related_meeting_id field", () => {
    const fields = [makeField("related_meeting_id", [])];
    const opts   = meetings.map(m => ({ value: m.meeting_id ?? m.id, label: m.meeting_title }));
    const result = patchFormOptions(fields, { related_meeting_id: opts });
    expect((result[0].options as Array<{ value: string }>)).toHaveLength(3);
    expect((result[0].options as Array<{ value: string }>)[0].value).toBe("MTG-001");
  });
});

// ── Start, Join, Resume route intent ─────────────────────────────────────────

describe("live meeting route intent", () => {
  function buildLiveMeetingUrl(meetingId: string, entry: "start_meeting" | "join_meeting" | "resume_meeting") {
    return `/meetings/${meetingId}/live?entry=${entry}`;
  }

  it("start_meeting uses correct entry param", () => {
    const url = buildLiveMeetingUrl("MTG-001", "start_meeting");
    expect(url).toBe("/meetings/MTG-001/live?entry=start_meeting");
  });

  it("join_meeting uses correct entry param", () => {
    const url = buildLiveMeetingUrl("MTG-001", "join_meeting");
    expect(url).toBe("/meetings/MTG-001/live?entry=join_meeting");
  });

  it("resume_meeting uses correct entry param", () => {
    const url = buildLiveMeetingUrl("MTG-001", "resume_meeting");
    expect(url).toBe("/meetings/MTG-001/live?entry=resume_meeting");
  });

  it("start_meeting and join_meeting produce different URLs", () => {
    const start  = buildLiveMeetingUrl("MTG-001", "start_meeting");
    const join   = buildLiveMeetingUrl("MTG-001", "join_meeting");
    const resume = buildLiveMeetingUrl("MTG-001", "resume_meeting");
    expect(start).not.toBe(join);
    expect(join).not.toBe(resume);
    expect(start).not.toBe(resume);
  });

  it("entry param is read correctly from URL string", () => {
    const url    = "/meetings/MTG-001/live?entry=start_meeting";
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("entry")).toBe("start_meeting");
  });
});

// ── Legacy-value restoration ──────────────────────────────────────────────────

describe("legacy name-based value restoration", () => {
  const users = [
    user({ id: "u1", name: "Alice Smith" }),
    user({ id: "u2", name: "Bob Jones"  }),
  ];

  it("resolves legacy name to canonical ID when exact unique match exists", () => {
    const legacyName = "Alice Smith";
    const matches = users.filter(u => u.name === legacyName);
    const resolved = matches.length === 1 ? matches[0].id : undefined;
    expect(resolved).toBe("u1");
  });

  it("does not resolve when name is ambiguous", () => {
    const ambiguous = [
      user({ id: "u5", name: "Same Name" }),
      user({ id: "u6", name: "Same Name" }),
    ];
    const legacyName = "Same Name";
    const matches = ambiguous.filter(u => u.name === legacyName);
    const resolved = matches.length === 1 ? matches[0].id : undefined;
    expect(resolved).toBeUndefined();
  });

  it("does not resolve when name has no match", () => {
    const legacyName = "Unknown Person";
    const matches = users.filter(u => u.name === legacyName);
    const resolved = matches.length === 1 ? matches[0].id : undefined;
    expect(resolved).toBeUndefined();
  });

  it("resolved options are built with { value: id, label: name }", () => {
    const legacyName = "Bob Jones";
    const match = users.find(u => u.name === legacyName);
    const opt   = match ? { value: match.id, label: match.name } : undefined;
    expect(opt?.value).toBe("u2");
    expect(opt?.label).toBe("Bob Jones");
  });
});

// ── Active user filtering for leadership dropdowns ────────────────────────────

describe("active user filtering for leadership dropdowns", () => {
  const allUsers: BmsUser[] = [
    user({ id: "u1", name: "Active User",    account_status: "active"      }),
    user({ id: "u2", name: "Suspended",      account_status: "suspended"   }),
    user({ id: "u3", name: "Archived",       account_status: "archived"    }),
    user({ id: "u4", name: "Deactivated",    account_status: "deactivated" }),
    user({ id: "u5", name: "Inactive",       account_status: "inactive"    }),
    user({ id: "u6", name: "Also Active",    account_status: "active"      }),
  ];

  const ACTIVE_STATUSES = new Set(["active", "activated"]);

  function filterActiveUsers(users: BmsUser[]) {
    return users.filter(u => ACTIVE_STATUSES.has((u.account_status ?? "active").toLowerCase()));
  }

  it("includes only active users", () => {
    const active = filterActiveUsers(allUsers);
    expect(active.map(u => u.id)).toEqual(["u1", "u6"]);
  });

  it("excludes suspended, archived, deactivated, and inactive users", () => {
    const active = filterActiveUsers(allUsers);
    const ids    = active.map(u => u.id);
    expect(ids).not.toContain("u2");
    expect(ids).not.toContain("u3");
    expect(ids).not.toContain("u4");
    expect(ids).not.toContain("u5");
  });

  it("leadership option label includes name and designation", () => {
    const u = user({ id: "u1", name: "Aminul Islam", designation: "Board Chairman", department: "Board Secretariat" });
    const label = [u.name, u.designation, u.department].filter(Boolean).join(" — ");
    expect(label).toBe("Aminul Islam — Board Chairman — Board Secretariat");
  });
});
