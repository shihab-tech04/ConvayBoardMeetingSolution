/**
 * WS-F RAM/PAM: ACK + authoritative snapshot acceptance.
 *
 * This code does NOT authorize mutations. The existing convay-access Edge
 * function and SQL/RLS/grants remain authoritative. A 2xx response is not
 * proof that the expected role/permission exists with requested values.
 * No UI-local state or optimistic permission escalation is permitted.
 */
import type { AccessPermission, AccessRole, AccessSnapshot } from
  "../services/supabase/convayAccess";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PERMISSION_CODE = /^[a-z][a-z0-9_-]{1,100}$/;
const normalize = (value: string) => value.trim();

function fail(): never {
  throw new Error("Server confirmation is incomplete. Refresh the access register before retrying.");
}
function current(snapshot: AccessSnapshot) {
  if (!snapshot.loaded || snapshot.error || !snapshot.is_super_admin) fail();
}
function ackId(ack: unknown, pattern: RegExp): string {
  if (!ack || typeof ack !== "object") fail();
  const id = (ack as Record<string, unknown>).id;
  if (typeof id !== "string" || !pattern.test(id)) fail();
  return id;
}
function acknowledged(ack: unknown) {
  if (!ack || typeof ack !== "object" || (ack as Record<string, unknown>).ok !== true) fail();
}
function matchingPermissions(actual: readonly string[], expected: readonly string[]) {
  const a = new Set(actual);
  const b = new Set(expected);
  return a.size === actual.length && b.size === expected.length &&
    a.size === b.size && [...a].every(id => b.has(id));
}

export type RoleMutationExpected = Pick<
  AccessRole, "name" | "description" | "level" | "status"
> & { id?: string; permission_ids: readonly string[] };

/** Returns the strictly verified new/current role ID. */
export function requireRoleMutationReadback(
  ack: unknown, snapshot: AccessSnapshot, expected: RoleMutationExpected,
): string {
  current(snapshot);
  const id = ackId(ack, UUID);
  if (expected.id && id !== expected.id) fail();
  const match = snapshot.roles.find(r => r.id === id);
  if (!match || normalize(match.name) !== normalize(expected.name) ||
    normalize(match.description) !== normalize(expected.description) ||
    match.level !== expected.level || match.status !== expected.status ||
    !matchingPermissions(match.permission_ids, expected.permission_ids)) fail();
  return id;
}

export function requireRoleDeletionReadback(
  ack: unknown, snapshot: AccessSnapshot, roleId: string,
): void {
  current(snapshot);
  acknowledged(ack);
  if (!UUID.test(roleId) || snapshot.roles.some(r => r.id === roleId) ||
    snapshot.user_assignments.some(a => a.role_id === roleId)) fail();
}

export type PermissionMutationExpected = Pick<
  AccessPermission, "id" | "label" | "group_id" | "endpoint" | "method" |
    "service_name" | "access_label" | "status"
> & { is_custom?: boolean };

/** Creation and edit must both retain exactly the requested server contract. */
export function requirePermissionMutationReadback(
  ack: unknown, snapshot: AccessSnapshot, expected: PermissionMutationExpected,
): void {
  current(snapshot);
  const id = ackId(ack, PERMISSION_CODE);
  if (id !== expected.id) fail();
  const actual = snapshot.permissions.find(p => p.id === id);
  if (!actual || normalize(actual.label) !== normalize(expected.label) ||
    actual.group_id !== expected.group_id ||
    actual.endpoint !== expected.endpoint || actual.method !== expected.method ||
    normalize(actual.service_name) !== normalize(expected.service_name) ||
    actual.access_label !== expected.access_label || actual.status !== expected.status ||
    (expected.is_custom !== undefined && actual.is_custom !== expected.is_custom)) fail();
}

export function requirePermissionDeletionReadback(
  ack: unknown, snapshot: AccessSnapshot, permissionId: string,
): void {
  current(snapshot);
  acknowledged(ack);
  if (!PERMISSION_CODE.test(permissionId) ||
    snapshot.permissions.some(p => p.id === permissionId) ||
    snapshot.roles.some(r => r.permission_ids.includes(permissionId))) fail();
}
