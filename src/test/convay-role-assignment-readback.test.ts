import { describe, expect, it } from "vitest";
import { requireRoleAssignmentReadback } from "../app/pages/administration-requests/roleAssignmentReadback";

const target = "11111111-1111-4111-8111-111111111111";
const r1 = "22222222-2222-4222-8222-222222222222";
const r2 = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const snapshot = (roles: string[], loaded = true, isAdmin = true) => ({
  loaded, is_super_admin: isAdmin,
  user_assignments: [
    ...roles.map(role_id => ({ user_id: target, role_id })),
    { user_id: other, role_id: r2 },
  ],
});

describe("server-confirmed user role assignment", () => {
  it("accepts an exact persisted role assignment irrespective of order", () => {
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([r2, r1]), target, [r1, r2])).not.toThrow();
  });
  it("accepts an explicitly cleared role list only when server confirms no roles", () => {
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([]), target, [])).not.toThrow();
  });
  it("rejects an HTTP-success response without the expected write acknowledgement", () => {
    expect(() => requireRoleAssignmentReadback({}, snapshot([r1]), target, [r1])).toThrow(/could not be verified/);
  });
  it("rejects stale snapshots and non-admin readback", () => {
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([r1], false), target, [r1])).toThrow();
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([r1], true, false), target, [r1])).toThrow();
  });
  it("rejects missing roles or extra roles even if the server said ok", () => {
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([]), target, [r1])).toThrow();
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([r1, r2]), target, [r1])).toThrow();
  });
  it("never mistakes another user's role assignments for the target's", () => {
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([]), target, [r2])).toThrow();
  });
  it("rejects duplicate requested IDs rather than silently deduplicating an invalid request", () => {
    expect(() => requireRoleAssignmentReadback({ ok: true }, snapshot([r1]), target, [r1, r1])).toThrow();
  });
});
