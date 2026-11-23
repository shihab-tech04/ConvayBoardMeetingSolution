import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261124011100_convay_gv360_org_unit_history.sql", "utf8");
const page = readFileSync("src/app/pages/governance/OrganizationStructurePage.tsx", "utf8");
const auth = readFileSync("src/app/services/supabase/convayAuth.ts", "utf8");

describe("GV-360 Organization unit audit and membership provenance", () => {
  it("creates an immutable private per-mutation audit event in the same SQL transaction", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS convay_private.org_member_assignment_events");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON convay_private.org_member_assignment_events FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("CREATE TRIGGER convay_org_member_events_immutable");
    expect(sql).toContain("BEFORE UPDATE OR DELETE ON convay_private.org_member_assignment_events");
    expect(sql).toContain("returning event_id into v_event_id");
    expect(sql).toContain("'audit_event_id','org-member-'||v_event_id::text");
    expect(sql).toContain("from convay_private.org_member_assignment_receipts");
    expect(sql).toContain("WHERE actor_id=v_actor AND request_id=p_request_id");
  });
  it("uses the signed-in server actor and restricts global history to authorized readers", () => {
    expect(sql).toContain("v_actor uuid := (SELECT auth.uid())");
    expect(sql).toContain("convay_private.has_permission('gov_org_view')");
    expect(sql).toContain("convay_private.has_permission('gov_org_manage')");
    expect(sql).toContain("AND r.tenant_id IS NULL");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.convay_org_unit_history(text,integer)");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.convay_org_unit_history(text,integer)");
  });
  it("reconciles organization history with membership event records", () => {
    expect(sql).toContain("FROM convay_private.entity_changes c");
    expect(sql).toContain("FROM convay_private.org_member_assignment_events e");
    expect(sql).toContain("e.previous_unit_id=p_unit_id OR e.new_unit_id=p_unit_id");
    expect(sql).toContain("org_user_transferred_out");
    expect(sql).toContain("org_user_transferred_in");
  });
  it("loads history from SQL with loading/error/retry rather than falsely displaying no history", () => {
    expect(auth).toContain('"/rest/v1/rpc/convay_org_unit_history"');
    expect(page).toContain("void convayAuth.orgUnitHistory(unit.id)");
    expect(page).toContain("Loading verified SQL audit history");
    expect(page).toContain("Retry audit history");
    expect(page).toContain("No SQL audit events for this unit");
    expect(page).toContain('import.meta.env.MODE === "test"');
  });
});
