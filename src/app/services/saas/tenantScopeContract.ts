/**
 * TEN-03 / WS-F: pure *contract model* for tenant-scoped server authorization.
 * NOT a security boundary. Browser/client decisions must never grant access.
 * SQL RLS, invoker RPC, trusted Edge/Auth identity and Storage policies remain
 * authoritative. Callers must assemble this input on the trusted server from
 * fresh DB membership and grants, not JWT user_metadata or request bodies.
 */
export type TenantLifecycle = "provisioning" | "active" | "suspended";
export type MembershipLifecycle = "active" | "suspended" | "revoked";
export type TenantDenialCode =
  | "invalid_scope" | "unauthenticated" | "session_inactive" | "tenant_inactive"
  | "membership_inactive" | "membership_stale" | "permission_denied" | "root_scope_denied";

export interface VerifiedSession {
  /** Identity derived server-side from the verified Auth session. */
  actorId: string | null;
  active: boolean;
  anonymous: boolean;
}
export interface TenantDescriptor {
  id: string;
  state: TenantLifecycle;
}
export interface TenantMembership {
  tenantId: string;
  userId: string;
  state: MembershipLifecycle;
  revision: number;
  revokedAt: string | null;
}
/** Explicit tenant-scoped root access receipt from a trusted audited service. */
export interface PlatformRootScope {
  actorId: string;
  tenantId: string;
  permission: string;
  receiptId: string;
  expiresAtMs: number;
  issuedFromServer: true;
}
export interface TenantAccessInput {
  session: VerifiedSession;
  tenant: TenantDescriptor | null;
  /** Freshly queried membership, not a local/session-cache snapshot. */
  membership: TenantMembership | null;
  /** The membership revision read from the DB in the authorization transaction. */
  authoritativeRevision: number | null;
  /** Server-resolved effective grants; never self-reported by the client. */
  effectivePermissions: readonly string[];
  requiredPermission: string;
  /** Root exceptions are not implicit; a trusted scoped audited receipt is needed. */
  rootScope?: PlatformRootScope | null;
  nowMs: number;
}
export type TenantAccessDecision =
  | { allowed: true; mode: "membership" | "audited_root"; tenantId: string }
  | { allowed: false; code: TenantDenialCode };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);
const sameUuid = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const deny = (code: TenantDenialCode): TenantAccessDecision => ({ allowed: false, code });

/**
 * Deterministic policy-contract check for WS0/WS-F integration tests.
 * Even if allowed, actual server-side RLS/RPC/Storage enforcement is mandatory.
 */
export function evaluateTenantScope(input: TenantAccessInput): TenantAccessDecision {
  const { session, tenant, membership, rootScope, authoritativeRevision, nowMs } = input;
  const permission = input.requiredPermission;
  if (!tenant || !isUuid(tenant.id) || !permission || permission.trim() !== permission ||
    !Number.isFinite(nowMs)) return deny("invalid_scope");
  if (!isUuid(session.actorId) || session.anonymous) return deny("unauthenticated");
  if (!session.active) return deny("session_inactive");
  if (tenant.state !== "active") return deny("tenant_inactive");

  if (membership && isUuid(membership.userId) && isUuid(membership.tenantId) &&
    sameUuid(membership.userId, session.actorId) && sameUuid(membership.tenantId, tenant.id)) {
    if (membership.state !== "active" || membership.revokedAt !== null) {
      return deny("membership_inactive");
    }
    if (!Number.isSafeInteger(membership.revision) || membership.revision < 1 ||
      authoritativeRevision === null || membership.revision !== authoritativeRevision) {
      return deny("membership_stale");
    }
    if (!input.effectivePermissions.includes(permission)) return deny("permission_denied");
    return { allowed: true, mode: "membership", tenantId: tenant.id };
  }

  // No broad 'is_super_admin' fallback; a root override must be scoped and
  // explicitly audited, with a live expiry, exact actor/tenant/action match.
  if (!rootScope || rootScope.issuedFromServer !== true || !isUuid(rootScope.actorId) ||
    !isUuid(rootScope.tenantId) || !sameUuid(rootScope.actorId, session.actorId) ||
    !sameUuid(rootScope.tenantId, tenant.id) || rootScope.permission !== permission ||
    !rootScope.receiptId.trim() || !Number.isFinite(rootScope.expiresAtMs) ||
    rootScope.expiresAtMs <= nowMs) return deny("root_scope_denied");
  return { allowed: true, mode: "audited_root", tenantId: tenant.id };
}
