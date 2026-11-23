import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertCompanyDirectory,assertCompanyProfile,assertProvisioningReadback,
  type CompanyProfile,
} from "../app/services/saas/companyDirectory";

const id="11111111-1111-4111-8111-111111111111";
const user="22222222-2222-4222-8222-222222222222";
const req="33333333-3333-4333-8333-333333333333";
const company={
  id,display_name:"Acme Board Company",lifecycle_state:"provisioning",
  created_at:"2026-11-23T00:00:00Z",updated_at:"2026-11-23T00:00:00Z",
  active_member_count:1,published_template_count:0,
} as const;
const event={id:12,action:"create",actor_id:user,target_user_id:null,
  occurred_at:"2026-11-23T00:00:00Z",request_id:req};
const raw=(): CompanyProfile=>({
  company,members:[{
    user_id:user,membership_role:"tenant_admin",membership_state:"active",
    revision:1,changed_at:"2026-11-23T00:00:00Z",revoked_at:null,
    display_name:"Company Owner",email:"owner@example.com",account_status:"active",
  }],templates:[],events:[event],
  tenant_isolation_certified:false,workspace_activation_enabled:false,
  subscription_activated:false,subscription_note:"Pending isolation",
});
const receipt={tenant_id:id,lifecycle_state:"provisioning" as const,
  action:"create" as const,request_id:req,audit_event_id:12,tenant_active:false as const};
const sql=readFileSync(resolve(process.cwd(),
  "supabase/migrations/20261123221500_convay_company_directory_360.sql"),"utf8");

describe("TEN-360-01 authorized company readback and provisioning",()=>{
  it("accepts SQL tenant directory only when isolation is explicitly uncertified",()=>{
    expect(assertCompanyDirectory({companies:[company],tenant_isolation_certified:false,
      workspace_activation_enabled:false}).companies).toHaveLength(1);
    expect(()=>assertCompanyDirectory({companies:[company],tenant_isolation_certified:true,
      workspace_activation_enabled:true})).toThrow();
  });
  it("rejects wrong company scopes and duplicated IDs",()=>{
    expect(()=>assertCompanyDirectory({companies:[company,company],
      tenant_isolation_certified:false,workspace_activation_enabled:false})).toThrow();
    expect(()=>assertCompanyDirectory({companies:[{...company,id:"foreign"}],
      tenant_isolation_certified:false,workspace_activation_enabled:false})).toThrow();
  });
  it("requires exact requested company ID, explicit disabled activation and valid membership scope",()=>{
    expect(assertCompanyProfile(raw(),id).members).toHaveLength(1);
    expect(()=>assertCompanyProfile(raw(),user)).toThrow();
    expect(()=>assertCompanyProfile({...raw(),subscription_activated:true},id)).toThrow();
    expect(()=>assertCompanyProfile({...raw(),members:[raw().members[0],raw().members[0]]},id)).toThrow();
    expect(()=>assertCompanyProfile({...raw(),workspace_activation_enabled:true},id)).toThrow();
  });
  it("only confirms provisioned company when matched by SQL profile and immutable audit receipt",()=>{
    expect(assertProvisioningReadback(receipt,raw()," Acme Board Company ",req).company.id).toBe(id);
    expect(()=>assertProvisioningReadback({...receipt,audit_event_id:91},raw(),company.display_name,req)).toThrow();
    expect(()=>assertProvisioningReadback({...receipt,tenant_active:true} as never,raw(),company.display_name,req)).toThrow();
    expect(()=>assertProvisioningReadback(receipt,raw(),"Other Co",req)).toThrow();
    expect(()=>assertProvisioningReadback(receipt,{...raw(),events:[]},company.display_name,req)).toThrow();
  });
  it("enforces verified platform root or company admin at SQL layer, never client-driven scope",()=>{
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("account_status='active'");
    expect(sql).toContain("account_role='super_admin'");
    expect(sql).toContain("membership_role='tenant_admin'");
    expect(sql).toContain("m.user_id=v_actor");
    expect(sql).toContain("m.tenant_id=p_tenant_id");
    expect(sql).toContain("raise exception 'Company detail access denied'");
    expect(sql).toContain("grant execute on function public.convay_company_directory(text,uuid) to authenticated");
    expect(sql).toContain("revoke all on function public.convay_company_directory(text,uuid) from public,anon,authenticated");
  });
  it("shows only actual SQL membership, templates and immutable admin events; no synthetic money",()=>{
    expect(sql).toContain("convay_private.tenant_memberships");
    expect(sql).toContain("convay_private.meeting_template_catalog");
    expect(sql).toContain("convay_private.tenant_control_events");
    expect(sql).toContain("'subscription_activated',false");
    expect(sql).toContain("'workspace_activation_enabled',false");
    expect(sql).toContain("'tenant_isolation_certified',false");
    expect(sql).not.toMatch(/\b(insert|update|delete)\s+into\s+convay_private\./i);
  });
});
