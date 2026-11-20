import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AccessSnapshot } from "../app/services/supabase/convayAccess";
import {
  documentActionGranted,
  documentActionSessionUnchanged,
} from "../app/components/documents/documentActionAccess";

function snapshot(overrides: Partial<AccessSnapshot> = {}): AccessSnapshot {
  return {
    loaded: true, error: null, is_super_admin: false,
    effective_permissions: [], user_role_ids: [], roles: [],
    permissions: [], user_assignments: [], ...overrides,
  };
}

describe("DC document drawer — real actor-grant action gates", () => {
  it("denies catalogued permission when actor has no effective grant", () => {
    expect(documentActionGranted("doc_share", snapshot())).toBe(false);
    expect(documentActionGranted("doc_download", snapshot({effective_permissions:["doc_view"]}))).toBe(false);
  });
  it("accepts the exact active actor grant, not a different permission", () => {
    const access=snapshot({effective_permissions:["doc_share"]});
    expect(documentActionGranted("doc_share", access)).toBe(true);
    expect(documentActionGranted("doc_edit", access)).toBe(false);
  });
  it("does not grant anything on signed-out or unloaded access", () => {
    expect(documentActionGranted("doc_share", snapshot({loaded:false,effective_permissions:["doc_share"]}))).toBe(false);
  });
  it("respects current SQL-backed super-admin entitlement", () => {
    expect(documentActionGranted("doc_download", snapshot({is_super_admin:true}))).toBe(true);
    expect(documentActionGranted("doc_edit", snapshot({is_super_admin:true,loaded:false}))).toBe(false);
  });
  it("rejects unknown/blank action rather than treating it as owner access", () => {
    expect(documentActionGranted("", snapshot({is_super_admin:true}))).toBe(false);
  });
  it("allows an unchanged snapshot for a current granted download", () => {
    const s=snapshot({effective_permissions:["doc_download"]});
    expect(documentActionSessionUnchanged("doc_download",s,s)).toBe(true);
  });
  it("rejects in-flight responses from a changed account even with same grants", () => {
    const old=snapshot({effective_permissions:["doc_download"]});
    const next=snapshot({effective_permissions:["doc_download"]});
    expect(documentActionSessionUnchanged("doc_download",old,next)).toBe(false);
  });
  it("rejects access changes and revocation before response delivery", () => {
    const old=snapshot({effective_permissions:["doc_download"]});
    expect(documentActionSessionUnchanged("doc_download",old,snapshot())).toBe(false);
    expect(documentActionSessionUnchanged("doc_download",old,old)).toBe(true);
  });
  it("wires the actual drawer to the current SQL snapshot instead of catalog existence", () => {
    const code=readFileSync("src/app/components/documents/DocumentDetailsDrawer.tsx","utf8");
    expect(code).toContain("useAccessSnapshot()");
    expect(code).toContain("documentActionGranted(permId, readAccessSnapshot())");
    expect(code).toContain('documentActionSessionUnchanged("doc_download", accessAtStart, readAccessSnapshot())');
    expect(code).not.toContain("reg.flatPermissions.some(");
    expect(code).toContain('documentActionGranted("doc_share", readAccessSnapshot())');
  });
});
