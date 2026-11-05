import { describe, expect, it } from "vitest";
import { buildInvitationOptions, INVITATION_REDIRECT_TO, mayAcceptInvitation } from "../../supabase/functions/convay-users/invitation";
import { isSupabaseInvitationCallback, readSupabaseInvitationCallback } from "../app/services/supabase/invitationCallback";

const validInvite = () => ({
  authEmail: "participant@example.com",
  profileEmail: "participant@example.com",
  emailConfirmedAt: "2026-11-05T17:00:00.000Z",
  accountRole: "user",
  accountStatus: "inactive",
  invitationStatus: "pending",
});

describe("verified Convay user invitations", () => {
  it("creates only a Supabase invite payload and never supplies a password or confirmation override", () => {
    const options = buildInvitationOptions("Test Participant");
    expect(options).toEqual({
      data: { display_name: "Test Participant" },
      redirectTo: INVITATION_REDIRECT_TO,
    });
    expect(options).not.toHaveProperty("email_confirm");
    expect(options).not.toHaveProperty("password");
  });

  it("allows activation only for the verified, matching, non-admin pending invitee", () => {
    expect(mayAcceptInvitation(validInvite())).toBe(true);
  });

  it("rejects an unverified email", () => {
    expect(mayAcceptInvitation({ ...validInvite(), emailConfirmedAt: null })).toBe(false);
  });

  it("rejects an email that does not match the persisted profile", () => {
    expect(mayAcceptInvitation({ ...validInvite(), authEmail: "other@example.com" })).toBe(false);
  });

  it("rejects a non-invited or already-processed identity", () => {
    expect(mayAcceptInvitation({ ...validInvite(), invitationStatus: null })).toBe(false);
    expect(mayAcceptInvitation({ ...validInvite(), invitationStatus: "accepted" })).toBe(false);
  });

  it("rejects privileged roles and profiles that are not awaiting invite activation", () => {
    expect(mayAcceptInvitation({ ...validInvite(), accountRole: "super_admin" })).toBe(false);
    expect(mayAcceptInvitation({ ...validInvite(), accountStatus: "suspended" })).toBe(false);
  });
});

describe("Supabase invitation callback routing", () => {
  it("recognizes an invitation token in the fragment", () => {
    const callback = readSupabaseInvitationCallback("", "#access_token=temporary-token&type=invite&token_type=bearer");
    expect(callback).toEqual({ accessToken: "temporary-token", type: "invite", error: "" });
    expect(isSupabaseInvitationCallback("", "#access_token=temporary-token&type=invite")).toBe(true);
  });

  it("recognizes an invitation token in the query string when the provider redirects to the Site URL", () => {
    expect(isSupabaseInvitationCallback("?access_token=temporary-token&type=invite", "")).toBe(true);
  });

  it("does not intercept ordinary sessions or invitation error callbacks", () => {
    expect(isSupabaseInvitationCallback("?access_token=session-token&type=recovery", "")).toBe(false);
    expect(isSupabaseInvitationCallback("?error=access_denied&type=invite", "")).toBe(false);
  });
});
