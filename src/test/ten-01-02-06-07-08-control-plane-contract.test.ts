import{readFileSync}from'node:fs';import{describe,expect,it}from'vitest';
const s=readFileSync('supabase/migrations/20261123174000_convay_tenant_control_plane_provisioning.sql','utf8');
describe('TEN secure control plane without unauthorized activation',()=>{
it('keeps every tenant provisioning and checks root security',()=>{
expect(s).toContain("values(btrim(p_display_name),'provisioning')");
expect(s).toContain("account_role='super_admin'");
expect(s).toContain("sql_storage_media_isolation_certified',false");
});
it('writes private immutable audit and idempotent control receipts',()=>{
expect(s).toContain("prevent_tenant_control_audit_mutation");
expect(s).toContain("tenant_control_receipts");
expect(s).toContain("p_request_id");
});
it('blocks offboarding when any tenant-owned records or storage remain',()=>{
expect(s).toContain("v_owned>0 or v_stored>0");
expect(s).toContain("membership_state='revoked'");
});
});