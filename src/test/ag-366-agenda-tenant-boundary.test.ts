import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  "supabase/migrations/20261124081000_convay_agenda_tenant_rls_document_scope.sql", "utf8"
);

describe("AG-366 Agenda tenant isolation and document-link authorization", () => {
  it("limits cross-company access without weakening existing business RLS", () => {
    expect(sql).toContain("AS RESTRICTIVE FOR ALL TO authenticated");
    expect(sql).toContain("convay_private.agenda_tenant_authorized(tenant_id)");
    expect(sql).toContain("WITH CHECK (");
    expect(sql).toContain("'bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks'");
    expect(sql).toContain("m.user_id=p.user_id");
    expect(sql).toContain("m.tenant_id=p_tenant");
    expect(sql).toContain("m.membership_state='active'");
    expect(sql).toContain("m.revoked_at IS NULL");
    expect(sql).toContain("t.lifecycle_state='active'");
    expect(sql).toContain("WHEN p_tenant IS NULL THEN false");
    expect(sql).toContain("p.account_role='super_admin'");
  });
  it("provides no anonymous tenant membership probe", () => {
    expect(sql).toContain("STABLE SECURITY DEFINER");
    expect(sql).toContain("SET search_path TO ''");
    expect(sql).toContain("FROM PUBLIC,anon");
    expect(sql).toContain("TO authenticated");
  });
  it("guards both the document and its linked Agenda tenant", () => {
    expect(sql).toContain("guard_agenda_document_tenant()");
    expect(sql).toContain("a.entity_key='bms.agenda'");
    expect(sql).toContain("d.entity_key='bms.documents'");
    expect(sql).toContain("NEW.tenant_id IS DISTINCT FROM v_agenda_tenant");
    expect(sql).toContain("NEW.tenant_id IS DISTINCT FROM v_document_tenant");
    expect(sql).toContain("WHEN (NEW.entity_key='bms.agendaDocumentLinks')");
  });
  it("leaves all existing data and shared registry RLS untouched", () => {
    expect(sql).not.toMatch(/DELETE FROM public\.convay_entity_records/i);
    expect(sql).not.toMatch(/UPDATE public\.convay_entity_records\s+SET/i);
    expect(sql).not.toContain("DROP POLICY convay_records");
    expect(sql).not.toContain("TRUNCATE");
  });
});
