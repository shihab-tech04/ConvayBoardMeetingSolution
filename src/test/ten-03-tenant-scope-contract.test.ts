import { describe, expect, it } from "vitest";
import { evaluateTenantScope, type TenantAccessInput } from "../app/services/saas/tenantScopeContract";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const ACTOR = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const nowMs = 1795154400000; // fixed UTC epoch: independent of global Date mocks
const base = (): TenantAccessInput => ({
  session: { actorId: ACTOR, active: true, anonymous: false },
  tenant: { id: A, state: "active" },
  membership: { tenantId: A, userId: ACTOR, state: "active", revision: 2, revokedAt: null },
  authoritativeRevision: 2,
  effectivePermissions: ["mtg_view"],
  requiredPermission: "mtg_view",
  nowMs,
});
const root = () => ({ actorId: ACTOR, tenantId: A, permission: "mtg_view",
  receiptId: "audit-root-1", expiresAtMs: nowMs + 1_000, issuedFromServer: true as const });

describe("TEN-03 tenant authorization contract (source-only, NOT RLS enforcement)", () => {
  it("permits a current authorized membership for the exact tenant and action", () => {
    expect(evaluateTenantScope(base())).toEqual({ allowed: true, mode: "membership", tenantId: A });
  });
  it("denies a cross-tenant membership even with the module permission", () => {
    expect(evaluateTenantScope({ ...base(), tenant: { id: B, state: "active" } }))
      .toEqual({ allowed: false, code: "root_scope_denied" });
  });
  it("rejects foreign actor membership", () => {
    expect(evaluateTenantScope({ ...base(), membership: { ...base().membership!, userId: OTHER } }).allowed).toBe(false);
  });
  it("rejects anonymous and absent identities", () => {
    expect(evaluateTenantScope({ ...base(), session: { actorId: ACTOR, active: true, anonymous: true } })).toEqual({ allowed: false, code: "unauthenticated" });
    expect(evaluateTenantScope({ ...base(), session: { actorId: null, active: true, anonymous: false } })).toEqual({ allowed: false, code: "unauthenticated" });
  });
  it("rejects sessions after server-side revocation", () => {
    expect(evaluateTenantScope({ ...base(), session: { actorId: ACTOR, active: false, anonymous: false } })).toEqual({ allowed: false, code: "session_inactive" });
  });
  it("denies provisioning and suspended tenant states", () => {
    for (const state of ["provisioning", "suspended"] as const)
      expect(evaluateTenantScope({ ...base(), tenant: { id: A, state } })).toEqual({ allowed: false, code: "tenant_inactive" });
  });
  it("denies suspended and revoked membership, including stale revoke timestamp", () => {
    for (const state of ["suspended", "revoked"] as const)
      expect(evaluateTenantScope({ ...base(), membership: { ...base().membership!, state } })).toEqual({ allowed: false, code: "membership_inactive" });
    expect(evaluateTenantScope({ ...base(), membership: { ...base().membership!, revokedAt: "2026-11-20T05:59:00Z" } }).allowed).toBe(false);
  });
  it("denies stale membership revisions and absent readback", () => {
    expect(evaluateTenantScope({ ...base(), authoritativeRevision: 3 })).toEqual({ allowed: false, code: "membership_stale" });
    expect(evaluateTenantScope({ ...base(), authoritativeRevision: null }).allowed).toBe(false);
  });
  it("requires the action-specific permission", () => {
    expect(evaluateTenantScope({ ...base(), requiredPermission: "mtg_cancel" })).toEqual({ allowed: false, code: "permission_denied" });
  });
  it("fails closed on malformed tenant IDs and empty permission", () => {
    expect(evaluateTenantScope({ ...base(), tenant: { id: "../tenant", state: "active" } })).toEqual({ allowed: false, code: "invalid_scope" });
    expect(evaluateTenantScope({ ...base(), requiredPermission: "" })).toEqual({ allowed: false, code: "invalid_scope" });
  });
  it("does not assume that a root account bypasses all tenants", () => {
    expect(evaluateTenantScope({ ...base(), membership: null })).toEqual({ allowed: false, code: "root_scope_denied" });
  });
  it("permits a trusted exact-action, exact-tenant, unexpired root receipt", () => {
    expect(evaluateTenantScope({ ...base(), membership: null, rootScope: root() })).toEqual({ allowed: true, mode: "audited_root", tenantId: A });
  });
  it("denies root receipt with foreign tenant, foreign actor or wrong permission", () => {
    for (const override of [{ tenantId: B }, { actorId: OTHER }, { permission: "mtg_cancel" }]) {
      expect(evaluateTenantScope({ ...base(), membership: null, rootScope: { ...root(), ...override } }).allowed).toBe(false);
    }
  });
  it("denies expired, malformed and unaudited root receipts", () => {
    expect(evaluateTenantScope({ ...base(), membership: null, rootScope: { ...root(), expiresAtMs: nowMs } }).allowed).toBe(false);
    expect(evaluateTenantScope({ ...base(), membership: null, rootScope: { ...root(), receiptId: " " } }).allowed).toBe(false);
  });
  it("rejects a forged root claim if the tenant is suspended", () => {
    expect(evaluateTenantScope({ ...base(), membership: null, rootScope: root(), tenant: { id: A, state: "suspended" } }).allowed).toBe(false);
  });
});
