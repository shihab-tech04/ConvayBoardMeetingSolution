import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261124111000_convay_tenant_legacy_visibility_boundary.sql",
  "utf8",
);

describe("TEN-ISO-02 legacy records cannot become a company data bypass", () => {
  it("keeps existing unscoped records for active, non-company legacy users", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION convay_private.legacy_unscoped_authorized()");
    expect(migration).toContain("p.account_status='active'");
    expect(migration).toContain("p.account_role='super_admin'");
    expect(migration).toContain("NOT EXISTS (");
    expect(migration).toContain("FROM convay_private.tenant_memberships m");
    expect(migration).toContain("m.user_id=p.user_id");
    expect(migration).toContain("m.membership_state='active'");
    expect(migration).toContain("m.revoked_at IS NULL");
    expect(migration).toContain("t.lifecycle_state<>'offboarded'");
  });

  it("uses authenticated SQL identity, not editable metadata or claims", () => {
    expect(migration).toContain("p.user_id=(SELECT auth.uid())");
    expect(migration).not.toContain("user_metadata");
    expect(migration).not.toContain("raw_user_meta_data");
    expect(migration).not.toMatch(/CREATE POLICY.*PERMISSIVE/);
    expect(migration).toContain("REVOKE ALL ON FUNCTION convay_private.legacy_unscoped_authorized()");
    expect(migration).toContain("TO authenticated");
  });

  it("cannot change existing Agenda ownership or reduce tenant membership restrictions", () => {
    expect(migration).toContain("AS RESTRICTIVE FOR ALL TO PUBLIC");
    expect(migration).toContain("WITH CHECK (");
    expect(migration).toContain("OR (tenant_id IS NULL AND convay_private.legacy_unscoped_authorized())");
    expect(migration).toContain("OR convay_private.tenant_member_active(tenant_id)");
    expect(migration).toContain("'bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks'");
    expect(migration).not.toContain("DROP POLICY convay_agenda_tenant_boundary");
    expect(migration).not.toMatch(/UPDATE public\.convay_entity_records|DELETE FROM public\.convay_entity_records/i);
  });

  it("applies the same legacy ownership boundary to document storage", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION convay_private.storage_tenant_member_active(p_path text)");
    expect(migration).toContain("SELECT count(*)=1 AND bool_and(");
    expect(migration).toContain("WHEN tenant_id IS NULL");
    expect(migration).toContain("THEN convay_private.legacy_unscoped_authorized()");
    expect(migration).toContain("ELSE convay_private.tenant_member_active(tenant_id)");
    expect(migration).not.toContain("DROP POLICY convay_storage_tenant_boundary");
    expect(migration).not.toMatch(/GRANT (SELECT|INSERT|UPDATE|DELETE|ALL) ON (public\.convay_entity_records|storage\.objects)/i);
  });
});
