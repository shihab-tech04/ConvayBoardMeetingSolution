import { describe, expect, it } from "vitest";
import type { AccessRole, AccessSnapshot } from "../app/services/supabase/convayAccess";
import {
  roleDeletionImpact, requireRoleUnassigned,
} from "../app/hooks/roleDeletionImpact";

const ROLE = "33333333-3333-4333-8333-333333333333";
const USER_A = "44444444-4444-4444-8444-444444444444";
const USER_B = "55555555-5555-4555-8555-555555555555";
const role: AccessRole = {
  id: ROLE, name: "Project Reviewer", description: "Review board records",
  level: "Viewer", status: "Active", is_system_role: false,
  permission_ids: ["mtg_view"], users_count: 0,
  created_at: "2026-11-20T00:00:00Z",
  updated_at: "2026-11-20T00:00:00Z",
};
const snap = (patch: Partial<AccessSnapshot> = {}): AccessSnapshot => ({
  loaded: true, error: null, is_super_admin: true,
  effective_permissions: [], user_role_ids: [],
  roles: [role], permissions: [], user_assignments: [],
  ...patch,
});
const assignment = (userId: string) => ({ user_id: userId, role_id: ROLE });

describe("WS-F RAM-05/08 actual role deletion impact", () => {
  it("allows confirmation only with an exact zero-assignment SQL snapshot", () => {
    const impact = roleDeletionImpact(snap(), ROLE);
    expect(impact).toEqual({
      status: "ready", count: 0, userIds: [],
      message: expect.stringContaining("No users"),
    });
    expect(() => requireRoleUnassigned(snap(), ROLE)).not.toThrow();
  });
  it("counts the actual joined user IDs and prevents an in-use deletion", () => {
    const snapshot = snap({
      roles: [{ ...role, users_count: 2 }],
      user_assignments: [assignment(USER_A), assignment(USER_B)],
    });
    expect(roleDeletionImpact(snapshot, ROLE)).toMatchObject({
      status: "assigned", count: 2, userIds: [USER_A, USER_B],
      message: expect.stringContaining("2 users"),
    });
    expect(() => requireRoleUnassigned(snapshot, ROLE)).toThrow(/2 users/);
  });
  it("singular messages reflect the actual one-user assignment", () => {
    const snapshot = snap({
      roles: [{ ...role, users_count: 1 }],
      user_assignments: [assignment(USER_A)],
    });
    expect(roleDeletionImpact(snapshot, ROLE)).toMatchObject({
      status: "assigned", count: 1,
      message: expect.stringContaining("1 user."),
    });
  });
  it("does not trust a zero display count when a real assignment exists", () => {
    const snapshot = snap({ user_assignments: [assignment(USER_A)] });
    expect(roleDeletionImpact(snapshot, ROLE).status).toBe("blocked");
    expect(() => requireRoleUnassigned(snapshot, ROLE)).toThrow(/counts disagree/);
  });
  it("does not trust a stale positive user count when joins are missing", () => {
    const snapshot = snap({ roles: [{ ...role, users_count: 1 }] });
    expect(roleDeletionImpact(snapshot, ROLE).status).toBe("blocked");
  });
  it("rejects repeated or malformed assignment rows", () => {
    const repeated = snap({
      roles: [{ ...role, users_count: 2 }],
      user_assignments: [assignment(USER_A), assignment(USER_A)],
    });
    expect(roleDeletionImpact(repeated, ROLE).status).toBe("blocked");
    const malformed = snap({
      user_assignments: [{ user_id: "not-a-uuid", role_id: ROLE }],
    });
    expect(roleDeletionImpact(malformed, ROLE).status).toBe("blocked");
  });
  it("rejects protected roles even if their SQL count claims zero", () => {
    const snapshot = snap({ roles: [{ ...role, is_system_role: true }] });
    expect(roleDeletionImpact(snapshot, ROLE)).toMatchObject({
      status: "blocked", message: expect.stringContaining("protected Super Admin"),
    });
  });
  it("rejects a non-Super-Admin or incomplete account snapshot", () => {
    for (const patch of [
      { loaded: false }, { error: "Server unreachable" },
      { is_super_admin: false },
    ]) {
      expect(roleDeletionImpact(snap(patch), ROLE).status).toBe("blocked");
      expect(() => requireRoleUnassigned(snap(patch), ROLE)).toThrow(/verified/);
    }
  });
  it("rejects ambiguous, absent or invalid role identifiers", () => {
    for (const snapshot of [
      snap({ roles: [] }), snap({ roles: [role, role] }),
    ]) {
      expect(roleDeletionImpact(snapshot, ROLE).status).toBe("blocked");
    }
    expect(roleDeletionImpact(snap(), "invalid").status).toBe("blocked");
  });
  it("never counts users assigned to a different role", () => {
    const OTHER = "66666666-6666-4666-8666-666666666666";
    const snapshot = snap({ user_assignments: [{ user_id: USER_A, role_id: OTHER }] });
    expect(roleDeletionImpact(snapshot, ROLE).status).toBe("ready");
  });
  it("rejects fake negative/fractional/missing server counts", () => {
    for (const count of [-1, .5, NaN, Infinity]) {
      expect(roleDeletionImpact(snap({
        roles: [{ ...role, users_count: count }],
      }), ROLE).status).toBe("blocked");
    }
  });
});
