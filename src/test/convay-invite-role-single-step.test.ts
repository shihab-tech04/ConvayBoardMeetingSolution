import { describe, expect, it } from "vitest";
import {
  isAssignableInvitationRole, hasExactInvitationRoleReadback,
} from "../../supabase/functions/convay-users/invitation";
import { requireUserMutationAck } from "../app/pages/administration-requests/userMutationAck";

const roleId = "e55de046-ae82-437a-ac80-0028ec8bfb1c";
const anotherRoleId = "94974925-7da6-41b7-9bbc-067b97a0a2ff";
const userId = "33333333-3333-4333-8333-333333333333";
const role = { id: roleId, status: "Active", is_system_role: false };
const pending = {
  user_id: userId, email: "invitee@example.com",
  account_status: "inactive", invitation_status: "pending",
  assigned_role_id: roleId,
};

describe("Convay single-step invite + role contract", () => {
  it("accepts an explicitly selected active non-system role", () => {
    expect(isAssignableInvitationRole(roleId, role)).toBe(true);
  });
  it("rejects omitted, malformed, inactive, mismatched or protected roles", () => {
    expect(isAssignableInvitationRole("", role)).toBe(false);
    expect(isAssignableInvitationRole("garbage", role)).toBe(false);
    expect(isAssignableInvitationRole(roleId, null)).toBe(false);
    expect(isAssignableInvitationRole(roleId, { ...role, status: "Inactive" })).toBe(false);
    expect(isAssignableInvitationRole(roleId, { ...role, is_system_role: true })).toBe(false);
    expect(isAssignableInvitationRole(roleId, { ...role, id: anotherRoleId })).toBe(false);
  });
  it("confirms only the exact single SQL user-role link", () => {
    expect(hasExactInvitationRoleReadback(roleId, [{ role_id: roleId }])).toBe(true);
    expect(hasExactInvitationRoleReadback(roleId, [])).toBe(false);
    expect(hasExactInvitationRoleReadback(roleId, null)).toBe(false);
    expect(hasExactInvitationRoleReadback(roleId, [{ role_id: anotherRoleId }])).toBe(false);
    expect(hasExactInvitationRoleReadback(roleId, [{ role_id: roleId }, { role_id: anotherRoleId }])).toBe(false);
  });
  it("requires the same user, email, pending status and assigned role in invitation response", () => {
    expect(() => requireUserMutationAck("invite", { user: pending }, {
      email: " INVITEE@EXAMPLE.COM ", roleId,
    })).not.toThrow();
    for (const invalidUser of [
      { ...pending, assigned_role_id: undefined },
      { ...pending, assigned_role_id: anotherRoleId },
      { ...pending, account_status: "active" },
      { ...pending, invitation_status: "accepted" },
      { ...pending, email: "other@example.com" },
    ]) {
      expect(() => requireUserMutationAck("invite", { user: invalidUser }, {
        email: pending.email, roleId,
      })).toThrow(/Server did not confirm/);
    }
  });
  it("does not grant roles or activate accounts in the client acknowledgement", () => {
    expect(() => requireUserMutationAck("invite", { user: pending }, {
      email: pending.email, roleId: anotherRoleId,
    })).toThrow();
  });
});
