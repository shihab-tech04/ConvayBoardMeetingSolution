import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  "supabase/migrations/20261103194130_convay_grant_trusted_service_role_rbac_privileges.sql",
  "utf8",
);
const edge = readFileSync("supabase/functions/convay-access/index.ts", "utf8");

describe("Convay login privilege regression", () => {
  it("explicitly grants the backend role access to every administration table", () => {
    for (const name of [
      "user_profiles", "user_admin_audit", "convay_roles",
      "convay_permissions", "convay_role_permissions", "convay_user_roles",
    ]) {
      expect(sql).toContain("public." + name);
    }
    expect(sql).toMatch(/grant select, insert, update, delete on[\s\S]*to service_role;/i);
    expect(sql).toMatch(/grant usage, select on sequence public\.user_admin_audit_event_id_seq[\s\S]*to service_role;/i);
    expect(sql).not.toMatch(/grant [\s\S]*to authenticated;/i);
  });

  it("does not label a database lookup failure as an inactive account", () => {
    expect(edge).toContain("if(profileError){");
    expect(edge).toContain("Unable to verify account access");
    expect(edge).toContain('if(profile.account_status!=="active")');
    expect(edge).toContain('error:"Account is not active"');
  });
});