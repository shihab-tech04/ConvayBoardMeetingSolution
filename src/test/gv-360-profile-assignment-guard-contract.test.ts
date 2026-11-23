import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261124012300_convay_gv360_guard_profile_org_assignment.sql", "utf8");

describe("GV-360-02 authoritative primary organization assignment write guard", () => {
  it("guards both profile creation and mutations of the five synchronized assignment fields", () => {
    expect(sql).toContain("CREATE TRIGGER convay_guard_primary_org_assignment");
    expect(sql).toContain("BEFORE INSERT OR UPDATE OF profile_data ON public.user_profiles");
    for (const field of [
      "primary_org_unit_id", "branch_id", "division_id",
      "department_id", "org_assignment_revision",
    ]) {
      expect(sql).toContain("NEW.profile_data->'" + field + "'");
      expect(sql).toContain("OLD.profile_data->'" + field + "'");
    }
  });
  it("fails closed on untrusted direct writers or missing signed-in actor", () => {
    expect(sql).toContain("(SELECT auth.uid()) IS NULL");
    expect(sql).toContain("current_user <> 'postgres'");
    expect(sql).toContain("current_setting('convay.gv04_actor',true)");
    expect(sql).toContain("Organization assignments require the authorized, audited SQL transaction");
  });
  it("permits assignment only from the validated atomic RPC with local actor proof", () => {
    expect(sql).toContain("convay_private.has_permission('gov_org_manage')");
    expect(sql).toContain("Member assignment has changed; refresh and retry");
    expect(sql).toContain("PERFORM pg_catalog.set_config('convay.gv04_actor',v_actor::text,true)");
    expect(sql).toContain("PERFORM pg_catalog.set_config('convay.gv04_actor','',true)");
    expect(sql).toContain("insert into convay_private.org_member_assignment_events");
    expect(sql).toContain("returning event_id into v_event_id");
  });
});
