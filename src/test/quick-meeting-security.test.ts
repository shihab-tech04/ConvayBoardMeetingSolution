import { describe, expect, it } from "vitest";
import {
  canCreateQuickMeeting,
  checkQuickGuestAdmission,
  checkQuickMeetingLink,
  isQuickMeetingSessionId,
  normalizeQuickParticipantName,
  type QuickMeetingAccessRecord,
  type QuickMeetingLinkAccessRecord,
} from "../../supabase/functions/convay-quick-meeting/quickMeetingRules";

const now = Date.parse("2026-11-06T06:00:00.000Z");
const meeting: QuickMeetingAccessRecord = {
  owner_id: "owner-id",
  meeting_kind: "quick",
  access_mode: "link",
  status: "active",
  expires_at: "2026-11-06T10:00:00.000Z",
  admission_locked: false,
  max_participants: 4,
};
const link: QuickMeetingLinkAccessRecord = {
  expires_at: "2026-11-06T10:00:00.000Z",
  revoked_at: null,
};

describe("isolated Quick Meeting guest admission", () => {
  it("accepts only an active quick meeting with an unexpired, unrevoked link", () => {
    expect(checkQuickMeetingLink(meeting, link, now)).toEqual({ allowed: true });
    expect(checkQuickMeetingLink({ ...meeting, meeting_kind: "governance" }, link, now)).toMatchObject({ allowed: false, status: 404 });
    expect(checkQuickMeetingLink({ ...meeting, access_mode: "member" }, link, now)).toMatchObject({ allowed: false, status: 404 });
    expect(checkQuickMeetingLink({ ...meeting, status: "ended" }, link, now)).toMatchObject({ allowed: false, status: 410 });
    expect(checkQuickMeetingLink({ ...meeting, expires_at: "2026-11-06T05:59:59.000Z" }, link, now)).toMatchObject({ allowed: false, status: 410 });
    expect(checkQuickMeetingLink(meeting, { ...link, expires_at: "2026-11-06T05:59:59.000Z" }, now)).toMatchObject({ allowed: false, status: 410 });
    expect(checkQuickMeetingLink(meeting, { ...link, revoked_at: "2026-11-06T05:00:00.000Z" }, now)).toMatchObject({ allowed: false, status: 410 });
  });

  it("denies locked, over-capacity and malformed rooms while allowing prior guests to return", () => {
    expect(checkQuickGuestAdmission({ meeting, link, participantCount: 3, identityAlreadyPresent: false, now })).toEqual({ allowed: true });
    expect(checkQuickGuestAdmission({ meeting, link, participantCount: 4, identityAlreadyPresent: false, now })).toMatchObject({ allowed: false, status: 409 });
    expect(checkQuickGuestAdmission({ meeting, link, participantCount: 4, identityAlreadyPresent: true, now })).toEqual({ allowed: true });
    expect(checkQuickGuestAdmission({ meeting: { ...meeting, admission_locked: true }, link, participantCount: 2, identityAlreadyPresent: false, now })).toMatchObject({ allowed: false, status: 423 });
    expect(checkQuickGuestAdmission({ meeting: { ...meeting, admission_locked: true }, link, participantCount: 2, identityAlreadyPresent: false, returningParticipant: true, now })).toEqual({ allowed: true });
    expect(checkQuickGuestAdmission({ meeting: { ...meeting, admission_locked: true }, link, participantCount: 4, identityAlreadyPresent: true, now })).toEqual({ allowed: true });
    expect(checkQuickGuestAdmission({ meeting: { ...meeting, max_participants: 5 }, link, participantCount: 0, identityAlreadyPresent: false, now })).toMatchObject({ allowed: false, status: 503 });
  });

  it("requires the existing meeting-create permission for hosts", () => {
    expect(canCreateQuickMeeting(false, ["mtg_view", "mtg_join"])).toBe(false);
    expect(canCreateQuickMeeting(false, ["mtg_create"])).toBe(true);
    expect(canCreateQuickMeeting(true, [])).toBe(true);
  });

  it("normalizes guest names and accepts only UUID v4 session ids", () => {
    expect(normalizeQuickParticipantName("  Nila\nGuest  ")).toBe("Nila Guest");
    expect(normalizeQuickParticipantName("x")).toBeNull();
    expect(normalizeQuickParticipantName("x".repeat(81))).toBeNull();
    expect(isQuickMeetingSessionId("f7dd7c6a-3b56-4ea8-9c21-53a5ac022365")).toBe(true);
    expect(isQuickMeetingSessionId("00000000-0000-0000-0000-000000000000")).toBe(false);
  });
});

describe("Quick Meeting route permissions", () => {
  it("protects host creation and management with mtg_create", async () => {
    const { mayVisitPath, permissionForPath } = await import("../app/services/supabase/convayAccess");
    const withoutCreate = {
      loaded: true, error: null, is_super_admin: false,
      effective_permissions: ["mtg_join", "mtg_view"], user_role_ids: [], roles: [], permissions: [], user_assignments: [],
    };
    const withCreate = { ...withoutCreate, effective_permissions: ["mtg_create"] };
    expect(permissionForPath("/meetings/quick-meeting")).toBe("mtg_create");
    expect(permissionForPath("/meetings/quick-meeting/ed98805a-716a-4980-a73e-0e64211be72a")).toBe("mtg_create");
    expect(mayVisitPath("/meetings/quick-meeting", withoutCreate)).toBe(false);
    expect(mayVisitPath("/meetings/quick-meeting/ed98805a-716a-4980-a73e-0e64211be72a", withoutCreate)).toBe(false);
    expect(mayVisitPath("/meetings/quick-meeting", withCreate)).toBe(true);
    expect(mayVisitPath("/meetings/quick-meeting/ed98805a-716a-4980-a73e-0e64211be72a", withCreate)).toBe(true);
    expect(mayVisitPath("/meetings/example/live", withoutCreate)).toBe(true);
  });
});
