import { describe, expect, it } from "vitest";
import { needsRoleAssignment, canCompleteInvitationRoleStep } from "../app/pages/administration-requests/invitationRoleState";

const user = { user_id: "u1", account_role: "user", account_status: "active", invitation_status: "accepted" };
const assigned = [{ user_id: "u1", role_id: "meeting-participant" }];

describe("Convay invitation role continuation and recovery", () => {
  it("flags an activated roleless invited account as requiring an authorized role", () => {
    expect(needsRoleAssignment(user, [])).toBe(true);
  });
  it("flags an invitation awaiting verification for admin role assignment", () => {
    expect(needsRoleAssignment({ ...user, account_status: "inactive", invitation_status: "pending" }, [])).toBe(true);
    expect(needsRoleAssignment({ ...user, account_status: "inactive", invitation_status: "verified" }, [])).toBe(true);
  });
  it("does not flag protected admin accounts or intentionally disabled accounts", () => {
    expect(needsRoleAssignment({ ...user, account_role: "super_admin" }, [])).toBe(false);
    expect(needsRoleAssignment({ ...user, account_status: "suspended" }, [])).toBe(false);
    expect(needsRoleAssignment({ ...user, account_status: "inactive", invitation_status: null }, [])).toBe(false);
  });
  it("respects confirmed assignments belonging only to the target account", () => {
    expect(needsRoleAssignment(user, assigned)).toBe(false);
    expect(needsRoleAssignment(user, [{ user_id: "u2", role_id: "meeting-participant" }])).toBe(true);
  });
  it("never completes the immediate invitation next step without an explicitly selected role", () => {
    expect(canCompleteInvitationRoleStep(true, [])).toBe(false);
    expect(canCompleteInvitationRoleStep(true, ["meeting-participant"])).toBe(true);
  });
  it("preserves deliberate administrator ability to clear a role on an existing account", () => {
    expect(canCompleteInvitationRoleStep(false, [])).toBe(true);
  });
});
