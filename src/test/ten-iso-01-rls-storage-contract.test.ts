import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql=readFileSync(
  "supabase/migrations/20261124041000_convay_tenant_registry_storage_boundary.sql",
  "utf8",
);

describe("TEN-ISO-01 mandatory SQL and Storage tenant-membership boundary",()=>{
  it("never trusts a browser-provided or editable JWT metadata tenant claim",()=>{
    expect(sql).toContain("m.user_id=(SELECT auth.uid())");
    expect(sql).toContain("p.account_status='active'");
    expect(sql).toContain("m.membership_state='active'");
    expect(sql).toContain("m.revoked_at IS NULL");
    expect(sql).toContain("t.lifecycle_state='active'");
    expect(sql).not.toContain("raw_user_meta_data");
    expect(sql).not.toContain("user_metadata");
    expect(sql).not.toContain("jwt() ->> 'tenant_id'");
  });
  it("adds a restrictive policy to non-Agenda registry rows without granting any new table access",()=>{
    expect(sql).toContain("CREATE POLICY convay_tenant_nonagenda_boundary");
    expect(sql).toContain("ON public.convay_entity_records");
    expect(sql).toMatch(/AS RESTRICTIVE\s+FOR ALL TO PUBLIC/);
    expect(sql).toContain("tenant_id IS NULL");
    expect(sql).toContain("convay_private.tenant_member_active(tenant_id)");
    expect(sql).toContain("bms.agendaDocumentLinks");
    expect(sql).toContain("bms.meetingAgendaLinks");
    expect(sql).not.toMatch(/GRANT (SELECT|INSERT|UPDATE|DELETE|ALL) ON (public\.convay_entity_records|storage\.objects)/i);
  });
  it("adds mandatory per-document Storage membership without replacing existing permission policies",()=>{
    expect(sql).toContain("CREATE POLICY convay_storage_tenant_boundary");
    expect(sql).toContain("ON storage.objects");
    expect(sql).toContain("AS RESTRICTIVE");
    expect(sql).toContain("bucket_id <> 'convay-documents'");
    expect(sql).toContain("convay_private.storage_tenant_member_active(name)");
    expect(sql).toContain("d.entity_key='bms.documents'");
    expect(sql).toContain("count(*)=1");
    expect(sql).toContain("bool_and(");
    expect(sql).not.toContain("DROP POLICY convay_doc_objects_select");
  });
  it("keeps authorization helper private, active-session scoped, and stage-only",()=>{
    expect(sql).toContain("SECURITY DEFINER SET search_path TO ''");
    expect(sql).toContain("REVOKE ALL ON FUNCTION convay_private.tenant_member_active(uuid)");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION convay_private.tenant_member_active(uuid)");
    expect(sql).not.toContain("UPDATE convay_private.tenants SET lifecycle_state='active'");
    expect(sql).not.toContain("tenant_isolation_certified',true");
    expect(sql).not.toContain("UPDATE public.convay_entity_records SET tenant_id=");
  });
});
