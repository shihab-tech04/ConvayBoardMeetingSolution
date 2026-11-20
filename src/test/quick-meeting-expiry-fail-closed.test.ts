import { describe, expect, it } from "vitest";
import {
  checkQuickMeetingLink,
  checkQuickGuestAdmission,
  type QuickMeetingAccessRecord,
  type QuickMeetingLinkAccessRecord,
} from "../../supabase/functions/convay-quick-meeting/quickMeetingRules";

const now = Date.parse("2026-11-20T03:00:00.000Z");
const meeting: QuickMeetingAccessRecord = {
  owner_id: "test-owner",
  meeting_kind: "quick",
  access_mode: "link",
  status: "active",
  expires_at: "2026-11-20T04:00:00.000Z",
  admission_locked: false,
  max_participants: 4,
};
const link: QuickMeetingLinkAccessRecord = {
  expires_at: "2026-11-20T03:30:00.000Z",
  revoked_at: null,
};

const expired = { allowed: false, status: 410 };

describe("QM-01 malformed expiry fail-closed boundary", () => {
  it("preserves normal valid, unexpired link admission", () => {
    expect(checkQuickMeetingLink(meeting, link, now)).toEqual({ allowed: true });
    expect(checkQuickGuestAdmission({ meeting, link, participantCount: 0, identityAlreadyPresent: false, now })).toEqual({ allowed: true });
  });

  it("rejects an invalid or missing meeting expiry", () => {
    expect(checkQuickMeetingLink({ ...meeting, expires_at: "invalid" }, link, now)).toMatchObject(expired);
    expect(checkQuickMeetingLink({ ...meeting, expires_at: undefined as unknown as string }, link, now)).toMatchObject(expired);
  });

  it("rejects an invalid or missing share-link expiry", () => {
    expect(checkQuickMeetingLink(meeting, { ...link, expires_at: "invalid" }, now)).toMatchObject(expired);
    expect(checkQuickMeetingLink(meeting, { ...link, expires_at: null as unknown as string }, now)).toMatchObject(expired);
  });

  it("rejects exactly expired or revoked links without changing their statuses", () => {
    expect(checkQuickMeetingLink(meeting, { ...link, expires_at: new Date(now).toISOString() }, now)).toMatchObject(expired);
    expect(checkQuickMeetingLink(meeting, { ...link, revoked_at: new Date(now - 1000).toISOString() }, now)).toMatchObject({ allowed: false, status: 410 });
  });

  it("propagates malformed expiry denial to the guest-admission gate", () => {
    expect(checkQuickGuestAdmission({ meeting, link: { ...link, expires_at: "corrupted" }, participantCount: 0, identityAlreadyPresent: false, now })).toMatchObject(expired);
  });
});
