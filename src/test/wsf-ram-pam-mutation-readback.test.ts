import { describe, expect, it } from "vitest";
import type { AccessPermission, AccessRole, AccessSnapshot } from
  "../app/services/supabase/convayAccess";
import {
  requireRoleMutationReadback, requireRoleDeletionReadback,
  requirePermissionMutationReadback, requirePermissionDeletionReadback,
} from "../app/hooks/accessMutationReadback";

const ROLE = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const PERM = "mtg_view";
const role: AccessRole = {
  id: ROLE, name: "Board Viewer", description: "Read meetings",
  level: "Viewer", status: "Active", is_system_role: false,
  permission_ids: ["mtg_view", "doc_view"], users_count: 0,
  created_at: "2026-11-20T00:00:00Z",
  updated_at: "2026-11-20T00:00:00Z",
};
const permission: AccessPermission = {
  id: PERM, label: "View Meetings", label_key: null,
  group_id: "meetings", endpoint: "/api/v1/meetings",
  method: "GET", service_name: "Meetings",
  access_label: "AUTHORIZE", status: "Active", is_custom: true,
  created_at: "2026-11-20T00:00:00Z",
  updated_at: "2026-11-20T00:00:00Z",
};
const snap = (
  roles: AccessRole[] = [role],
  permissions: AccessPermission[] = [permission],
): AccessSnapshot => ({
  loaded: true, error: null, is_super_admin: true,
  effective_permissions: [], user_role_ids: [],
  roles, permissions, user_assignments: [],
});
const expectedRole = {
  id: ROLE, name: role.name, description: role.description,
  level: role.level, status: role.status,
  permission_ids: role.permission_ids,
};
const expectedPerm = {
  id: permission.id, label: permission.label, group_id: permission.group_id,
  endpoint: permission.endpoint, method: permission.method,
  service_name: permission.service_name, access_label: permission.access_label,
  status: permission.status, is_custom: true,
};
const DENIED = /Server confirmation is incomplete/;

describe("WS-F RAM/PAM role and permission mutation truthfulness", () => {
  it("accepts exact role creation and compares permission IDs as sets", () => {
    const snapshot = snap([{ ...role, permission_ids: ["doc_view", "mtg_view"] }]);
    expect(requireRoleMutationReadback({ id: ROLE }, snapshot,
      { ...expectedRole, id: undefined })).toBe(ROLE);
  });
  it("rejects missing/invalid role ACK or a different returned role", () => {
    expect(() => requireRoleMutationReadback({}, snap(), expectedRole)).toThrow(DENIED);
    expect(() => requireRoleMutationReadback({ id: "not-uuid" }, snap(), expectedRole)).toThrow(DENIED);
    expect(() => requireRoleMutationReadback({ id: OTHER }, snap(), expectedRole)).toThrow(DENIED);
  });
  it("rejects a role write missing from the refreshed SQL snapshot", () => {
    expect(() => requireRoleMutationReadback({ id: ROLE }, snap([]), expectedRole)).toThrow(DENIED);
  });
  it("rejects mismatched effective role permissions, status, name and level", () => {
    for (const changed of [
      { permission_ids: ["mtg_view"] },
      { permission_ids: ["mtg_view", "mtg_view"] },
      { status: "Inactive" as const },
      { name: "Unexpected" },
      { level: "Admin" },
    ]) {
      expect(() => requireRoleMutationReadback({ id: ROLE }, snap([{ ...role, ...changed }]), expectedRole))
        .toThrow(DENIED);
    }
  });
  it("requires a loaded current Super Admin snapshot, not stale account privileges", () => {
    const expired = { ...snap(), loaded: false };
    const switched = { ...snap(), is_super_admin: false };
    const failed = { ...snap(), error: "Connection lost" };
    for (const snapshot of [expired, switched, failed])
      expect(() => requireRoleMutationReadback({ id: ROLE }, snapshot, expectedRole))
        .toThrow(DENIED);
  });
  it("accepts confirmed role deletion only when role and assignments disappear", () => {
    expect(() => requireRoleDeletionReadback({ ok: true }, snap([]), ROLE)).not.toThrow();
    expect(() => requireRoleDeletionReadback({ ok: true }, snap(), ROLE)).toThrow(DENIED);
    expect(() => requireRoleDeletionReadback({ ok: false }, snap([]), ROLE)).toThrow(DENIED);
    expect(() => requireRoleDeletionReadback({ ok: true },
      { ...snap([]), user_assignments: [{ user_id: OTHER, role_id: ROLE }] }, ROLE)).toThrow(DENIED);
  });
  it("accepts exact permission creation after authoritative readback", () => {
    expect(() => requirePermissionMutationReadback({ id: PERM }, snap(), expectedPerm))
      .not.toThrow();
  });
  it("rejects wrong or malformed permission acknowledgment", () => {
    expect(() => requirePermissionMutationReadback({}, snap(), expectedPerm)).toThrow(DENIED);
    expect(() => requirePermissionMutationReadback({ id: "wrong_perm" }, snap(), expectedPerm)).toThrow(DENIED);
    expect(() => requirePermissionMutationReadback({ id: "???" }, snap(), expectedPerm)).toThrow(DENIED);
  });
  it("rejects unconfirmed permission metadata, method, access, status and custom flag", () => {
    for (const changed of [
      { label: "Wrong" }, { method: "POST" as const },
      { endpoint: "/api/v1/other" }, { group_id: "home" },
      { access_label: "PUBLIC" as const }, { status: "Inactive" as const },
      { is_custom: false },
    ]) {
      expect(() => requirePermissionMutationReadback({ id: PERM },
        snap([role], [{ ...permission, ...changed }]), expectedPerm)).toThrow(DENIED);
    }
  });
  it("rejects a permission absent from the refreshed register", () => {
    expect(() => requirePermissionMutationReadback({ id: PERM }, snap([], []), expectedPerm))
      .toThrow(DENIED);
  });
  it("accepts deleting a custom permission only after cascade from all roles", () => {
    expect(() => requirePermissionDeletionReadback({ ok: true },
      snap([{ ...role, permission_ids: ["doc_view"] }], []), PERM)).not.toThrow();
  });
  it("rejects deletion if permission or any role grant survives", () => {
    expect(() => requirePermissionDeletionReadback({ ok: true }, snap(), PERM))
      .toThrow(DENIED);
    expect(() => requirePermissionDeletionReadback({ ok: true }, snap([role], []), PERM))
      .toThrow(DENIED);
    expect(() => requirePermissionDeletionReadback({ ok: false }, snap([], []), PERM))
      .toThrow(DENIED);
  });
  it("rejects deletion after failed access reload or mismatched privilege", () => {
    expect(() => requirePermissionDeletionReadback({ ok: true },
      { ...snap([], []), is_super_admin: false }, PERM)).toThrow(DENIED);
    expect(() => requireRoleDeletionReadback({ ok: true },
      { ...snap([], []), loaded: false }, ROLE)).toThrow(DENIED);
  });
});
