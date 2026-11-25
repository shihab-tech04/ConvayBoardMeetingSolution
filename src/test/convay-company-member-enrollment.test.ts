import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertCompanyMembershipReadback,
  type CompanyProfile,type CompanyMembershipReceipt,
} from "../app/services/saas/companyDirectory";

const tenantId="11111111-1111-4111-8111-111111111111";
const memberId="22222222-2222-4222-8222-222222222222";
const requestId="33333333-3333-4333-8333-333333333333";
const email="member@example.com";
const event={
  id:42,action:"add_member",actor_id:"44444444-4444-4444-8444-444444444444",
  target_user_id:memberId,occurred_at:"2026-11-23T12:00:00Z",request_id:requestId,
};
const profile=():CompanyProfile=>({
  company:{id:tenantId,display_name:"Example Board",lifecycle_state:"provisioning",
    created_at:"2026-11-23T00:00:00Z",updated_at:"2026-11-23T00:00:00Z"},
  members:[{user_id:memberId,membership_role:"tenant_admin",membership_state:"active",
    revision:1,changed_at:"2026-11-23T12:00:00Z",revoked_at:null,
    display_name:"Company Admin",email,account_status:"active"}],
  templates:[],events:[event],tenant_isolation_certified:false,
  workspace_activation_enabled:false,subscription_activated:false,
  subscription_note:"No activated subscription",
});
const receipt=():CompanyMembershipReceipt=>({
  tenant_id:tenantId,member_user_id:memberId,
  member_role:"tenant_admin",request_id:requestId,
  action:"add_member",audit_event_id:42,
  tenant_active:false,meeting_access_activated:false,
});
const expected={tenantId,requestId,action:"add_member" as const,email,role:"tenant_admin" as const};
const migration=readFileSync(resolve(process.cwd(),
  "supabase/migrations/20261123225000_convay_company_verified_member_enrollment.sql"),"utf8");

describe("TEN-360-02 Company Super Admin enrollment and revocation readback",()=>{
  it("acknowledges a verified Company Super Admin only after exact SQL membership and audit",()=>{
    expect(assertCompanyMembershipReadback(receipt(),profile(),expected).user_id).toBe(memberId);
    expect(assertCompanyMembershipReadback(receipt(),profile(),{...expected,email:" MEMBER@EXAMPLE.COM "}).email).toBe(email);
  });
  it("rejects foreign company, user, reused request, operation and unsafe activation receipts",()=>{
    for(const bad of [
      {...receipt(),tenant_id:memberId},
      {...receipt(),member_user_id:tenantId},
      {...receipt(),request_id:memberId},
      {...receipt(),action:"revoke_member" as const},
      {...receipt(),meeting_access_activated:true},
      {...receipt(),tenant_active:true},
    ]){
      expect(()=>assertCompanyMembershipReadback(bad as CompanyMembershipReceipt,profile(),expected)).toThrow();
    }
  });
  it("rejects missing, foreign, duplicate-role, suspended and wrong-email member readbacks",()=>{
    for(const mutation of [
      {...profile(),members:[]},
      {...profile(),members:[{...profile().members[0],user_id:tenantId}]},
      {...profile(),members:[{...profile().members[0],membership_role:"member" as const}]},
      {...profile(),members:[{...profile().members[0],membership_state:"suspended" as const}]},
      {...profile(),members:[{...profile().members[0],email:"wrong@example.com"}]},
    ]){
      expect(()=>assertCompanyMembershipReadback(receipt(),mutation,expected)).toThrow();
    }
  });
  it("requires immutable audit exact action, event and target",()=>{
    for(const eventOverride of [
      {...event,id:3}, {...event,request_id:tenantId},
      {...event,target_user_id:tenantId}, {...event,action:"revoke_member"},
    ]){
      expect(()=>assertCompanyMembershipReadback(receipt(),
        {...profile(),events:[eventOverride]},expected)).toThrow();
    }
  });
  it("confirms revocation only when membership is revoked and audit agrees",()=>{
    const revokeProfile={...profile(),
      members:[{...profile().members[0],membership_state:"revoked" as const,
        revoked_at:"2026-11-23T12:02:00Z"}],
      events:[{...event,action:"revoke_member"}],
    };
    const revokeReceipt:CompanyMembershipReceipt={
      ...receipt(),action:"revoke_member",member_role:undefined,
    };
    expect(assertCompanyMembershipReadback(revokeReceipt,revokeProfile,
      {tenantId,requestId,action:"revoke_member",userId:memberId}).membership_state).toBe("revoked");
    expect(()=>assertCompanyMembershipReadback(revokeReceipt,profile(),
      {tenantId,requestId,action:"revoke_member",userId:memberId})).toThrow();
  });
  it("requires an active, email-verified, globally role-assigned Convay account",()=>{
    expect(migration).toContain("join auth.users a on a.id=p.user_id");
    expect(migration).toContain("a.email_confirmed_at is not null");
    expect(migration).toContain("p.account_status='active'");
    expect(migration).toContain("public.convay_user_roles");
    expect(migration).toContain("r.status='Active'");
    expect(migration).toContain("p.account_role='user'");
  });
  it("checks verified tenant ownership and platform-only Company Super Admin assignment",()=>{
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("convay_private.tenant_admin_authorized(p_tenant_id)");
    expect(migration).toContain("not coalesce(v_is_platform_root,false)");
    expect(migration).toContain("p_member_role='tenant_admin'");
    expect(migration).toContain("v_receipt:=public.convay_tenant_admin(");
    expect(migration).toContain("'add_member',p_request_id,p_tenant_id");
    expect(migration).toContain("'meeting_access_activated',false");
    expect(migration).toContain("revoke all on function public.convay_company_member_enroll");
    expect(migration).toContain("grant execute on function public.convay_company_member_enroll");
    expect(migration).not.toMatch(/\b(insert|update|delete)\s+convay_private\.tenant_memberships/i);
  });
});
