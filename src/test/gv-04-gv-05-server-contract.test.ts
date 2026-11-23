import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261123232500_convay_gv04_gv05_authorized_org_member_assignment.sql",
  "utf8",
);
const userRegistry = readFileSync("src/app/data/bmsUsers.ts", "utf8");
const auth = readFileSync("src/app/services/supabase/convayAuth.ts", "utf8");
const deactivation = readFileSync("src/app/pages/governance/modals/DeactivateUnitModal.tsx", "utf8");

describe("GV-03/04/05 SQL role, tenant and mutation contract", () => {
  it("uses the actual signed-in actor and permission, not a supplied actor", () => {
    expect(sql).toContain("v_actor uuid := (SELECT auth.uid())");
    expect(sql).toContain("convay_private.has_permission('gov_org_manage')");
    expect(sql).toContain("v_profile public.user_profiles%ROWTYPE");
    expect(sql).toContain("account_status='active'");
  });
  it("does not permit users with active tenant memberships into the legacy global write", () => {
    expect(sql).toContain("Tenant membership requires tenant-scoped assignment flow");
    expect(sql).toContain("v_target.tenant_id IS NOT NULL");
    expect(sql).toContain("v_original.tenant_id IS NOT NULL");
  });
  it("checks the expected old unit and prevents double-primary assignments", () => {
    expect(sql).toContain("v_old IS DISTINCT FROM NULLIF(p_expected_unit_id,'')");
    expect(sql).toContain("Member already has a primary unit; use Transfer");
    expect(sql).toContain("pg_catalog.pg_advisory_xact_lock");
  });
  it("stores immutable receipt and revision with private RLS and no public write grant", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS convay_private.org_member_assignment_receipts");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON convay_private.org_member_assignment_receipts FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("org_assignment_revision");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.convay_assign_org_member");
  });
  it("enforces deactivation dependencies on the SQL record, not a local checkbox", () => {
    expect(sql).toContain("CREATE TRIGGER convay_guard_unit_deactivation");
    expect(sql).toContain("p.profile_data->>'primary_org_unit_id'=v_unit_id");
    expect(sql).toContain("c.payload->>'parent_unit_id'=v_unit_id");
    expect(sql).toContain("h.entity_key='bms.unitheads'");
    expect(deactivation).not.toContain('onClick={() => markResolved("users")}');
    expect(deactivation).toContain("sourceReady && unitCanDeactivate");
    expect(deactivation).not.toContain("head_user_id:        undefined");
  });
  it("projects the same verified assignment to user directory, forms and member counts", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.convay_org_member_directory");
    expect(userRegistry).toContain("const byMemberId = new Map(assignedRows.map");
    expect(userRegistry).toContain("primary_org_unit_id: assigned?.primary_org_unit_id");
    expect(auth).toContain("await this.orgMemberDirectory()");
    expect(auth).toContain("Number(member.assignment_revision) !== receipt.revision");
  });
});
