import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canPublishOnlineMeeting } from "../../supabase/functions/convay-livekit/publisherGrant";
import type { AdmissionContext } from "../../supabase/functions/convay-livekit/admission";

const context = (): AdmissionContext => ({
  meeting: { id: "MTG-1", meeting_id: "MTG-1", mode: "Hybrid", approval_status: "In Progress" },
  session: { meeting_id: "MTG-1", session_status: "active" },
  links: [{ meeting_id: "MTG-1", user_id: "member-1", participant_type: "Presenter" }],
  userId: "member-1", isSuperAdmin: false, permissions: ["mtg_join"],
});

const asRole = (role?: string): AdmissionContext => ({
  ...context(),
  links: [{ meeting_id: "MTG-1", user_id: "member-1", participant_type: role }],
});

describe("Server-issued regular-meeting media publisher policy", () => {
  it.each(["Chairperson", "Meeting Secretary", "Member", "Presenter",
    "Organizer", "Company Secretary", "Board Member", "Independent Director", "Administrator"])(
    "publishes only for an authorized saved participant role: %s", role => {
      expect(canPublishOnlineMeeting(asRole(role))).toBe(true);
    },
  );
  it.each(["Observer", "Guest", "Invitee", "", "Unknown"])(
    "keeps an admitted %s subscribe-only", role => {
      expect(canPublishOnlineMeeting(asRole(role))).toBe(false);
    },
  );
  it("unknown roles and contradictory linked roles fail closed", () => {
    expect(canPublishOnlineMeeting(asRole(undefined))).toBe(false);
    expect(canPublishOnlineMeeting({ ...context(), links: [
      { meeting_id: "MTG-1", user_id: "member-1", participant_type: "Presenter" },
      { meeting_id: "MTG-1", user_id: "member-1", participant_type: "Observer" },
    ] })).toBe(false);
  });
  it("cannot mint a grant from another user's link or another meeting", () => {
    expect(canPublishOnlineMeeting({ ...context(),
      links: [{ meeting_id: "MTG-1", user_id: "other", participant_type: "Presenter" }] })).toBe(false);
    expect(canPublishOnlineMeeting({ ...context(),
      links: [{ meeting_id: "MTG-2", user_id: "member-1", participant_type: "Presenter" }] })).toBe(false);
  });
  it("allows only an authenticated resource leader without a roster link", () => {
    expect(canPublishOnlineMeeting({ ...context(), links: [],
      meeting: { ...context().meeting, organizer: "member-1" } })).toBe(true);
    expect(canPublishOnlineMeeting({ ...context(), links: [],
      meeting: { ...context().meeting, organizer: "Display Name" } })).toBe(false);
  });
  it("does not let a resource leader override an explicit Observer role", () => {
    expect(canPublishOnlineMeeting({ ...asRole("Observer"),
      meeting: { ...context().meeting, organizer: "member-1" } })).toBe(false);
  });
  it("allows the authenticated global Super Admin but not a revoked member", () => {
    expect(canPublishOnlineMeeting({ ...context(), isSuperAdmin: true,
      userId: "admin", links: [], permissions: [] })).toBe(true);
    expect(canPublishOnlineMeeting({ ...context(), permissions: [] })).toBe(false);
  });
  it("refuses to publish for ended or conflicting lifecycle states", () => {
    expect(canPublishOnlineMeeting({ ...context(), session: { session_status: "ended" } })).toBe(false);
    expect(canPublishOnlineMeeting({ ...context(),
      meeting: { ...context().meeting, status: "Cancelled" } })).toBe(false);
    expect(canPublishOnlineMeeting({ ...context(),
      meeting: { ...context().meeting, meeting_mode: "Physical" } })).toBe(false);
  });
  it("the Edge token issuer never hardcodes canPublish true for joined viewers", () => {
    const issuer = readFileSync("supabase/functions/convay-livekit/index.ts", "utf8");
    expect(issuer).toContain('import { canPublishOnlineMeeting } from "./publisherGrant.ts";');
    expect(issuer).toContain("const canPublishMedia = canPublishOnlineMeeting(admission)");
    expect(issuer).toContain("canPublish: canPublishMedia");
    expect(issuer).toContain("canSubscribe: true");
    expect(issuer).not.toContain("canPublish: true");
  });
});
