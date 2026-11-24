import { afterEach,describe,expect,it,vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("../app/services/supabase/convayAuth",()=>({
  convayAuth:{authenticatedRequest:vi.fn()},
}));
import { convayAuth } from "../app/services/supabase/convayAuth";
import {
  listPendingCompanyInvitations,queuePendingCompanyInvitation,
  cancelPendingCompanyInvitation,
} from "../app/services/saas/companyDirectory";

const request=vi.mocked(convayAuth.authenticatedRequest);
const tenant="11111111-1111-4111-8111-111111111111";
const member="22222222-2222-4222-8222-222222222222";
const requestId="33333333-3333-4333-8333-333333333333";
const email="invited@example.com";
const invitation=(status:"pending"|"claimed"|"cancelled"="pending")=>({
  tenant_id:tenant,user_id:member,email,membership_role:"tenant_admin",
  status,request_id:requestId,requested_at:"2026-11-24T00:00:00Z",
  expires_at:"2026-12-08T00:00:00Z",claimed_at:status==="claimed"?"2026-11-24T00:02:00Z":null,
});
const receipt=(status:"pending"|"cancelled"="pending")=>({
  tenant_id:tenant,user_id:member,email,membership_role:"tenant_admin",
  status,request_id:requestId,audit_event_id:12,
  tenant_active:false,meeting_access_activated:false,
});
const ok=(value:unknown,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{"Content-Type":"application/json"},
});
afterEach(()=>vi.resetAllMocks());

describe("TEN-ONB-03: pending company invitation to verified SQL membership",()=>{
  it("queues an existing pending invitation only with exact SQL receipt and directory readback",async()=>{
    request.mockResolvedValueOnce(ok(receipt())).mockResolvedValueOnce(ok({
      tenant_id:tenant,invites:[invitation()],
    }));
    const result=await queuePendingCompanyInvitation(tenant," Invited@Example.com ","tenant_admin",requestId);
    expect(result.receipt.status).toBe("pending");
    expect(result.invites[0].user_id).toBe(member);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe("/rest/v1/rpc/convay_company_invitation");
    expect(JSON.parse(request.mock.calls[0][1]?.body as string)).toEqual({
      p_action:"queue",p_tenant_id:tenant,p_email:email,
      p_member_role:"tenant_admin",p_request_id:requestId,
    });
  });
  it("cancels the pending company assignment without cancelling the independent Auth invitation",async()=>{
    request.mockResolvedValueOnce(ok(receipt("cancelled"))).mockResolvedValueOnce(ok({
      tenant_id:tenant,invites:[invitation("cancelled")],
    }));
    const result=await cancelPendingCompanyInvitation(tenant,email,requestId);
    expect(result.receipt.status).toBe("cancelled");
    expect(JSON.parse(request.mock.calls[0][1]?.body as string).p_action).toBe("cancel");
  });
  it("never confirms a foreign tenant or missing SQL readback",async()=>{
    request.mockResolvedValueOnce(ok({...receipt(),tenant_id:member}));
    await expect(queuePendingCompanyInvitation(tenant,email,"tenant_admin",requestId))
      .rejects.toThrow("SQL did not confirm");
    request.mockResolvedValueOnce(ok(receipt())).mockResolvedValueOnce(ok({
      tenant_id:tenant,invites:[],
    }));
    await expect(queuePendingCompanyInvitation(tenant,email,"tenant_admin",requestId))
      .rejects.toThrow("SQL readback is stale");
  });
  it("rejects untrusted company scopes and malformed directory records",async()=>{
    await expect(listPendingCompanyInvitations("not-a-uuid")).rejects.toThrow("Invalid company scope");
    await expect(queuePendingCompanyInvitation(tenant,"bad-email","member",requestId))
      .rejects.toThrow("pending Convay invitation");
    request.mockResolvedValueOnce(ok({tenant_id:member,invites:[invitation()]}));
    await expect(listPendingCompanyInvitations(tenant)).rejects.toThrow("scope");
  });
  it("denies HTTP authorization failure without showing a false enrollment",async()=>{
    request.mockResolvedValueOnce(ok({message:"Platform Super Admin required"},403));
    await expect(queuePendingCompanyInvitation(tenant,email,"member",requestId))
      .rejects.toThrow("Platform Super Admin required");
  });
  it("enforces role/identity checks, private RLS, and a service-role-only claim",()=>{
    const sql=readFileSync("supabase/migrations/20261124093000_convay_pending_company_invitation_claim.sql","utf8");
    expect(sql).toContain("convay_private.pending_company_invites ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON TABLE convay_private.pending_company_invites FROM PUBLIC,anon,authenticated");
    expect(sql).toContain("p.account_role='super_admin' AND p.account_status='active'");
    expect(sql).toContain("a.raw_app_meta_data->>'convay_invitation_status'='pending'");
    expect(sql).toContain("p.account_role='user'");
    expect(sql).toContain("p.account_status='active'");
    expect(sql).toContain("a.email_confirmed_at IS NOT NULL");
    expect(sql).toContain("r.status='Active'");
    expect(sql).toContain("FOR UPDATE OF i");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.convay_claim_pending_company_invites(uuid) TO service_role");
    expect(sql).toContain("FROM PUBLIC,anon,authenticated");
    expect(sql).toContain("'tenant_active',false,'meeting_access_activated',false");
  });
  it("claims membership only before finalizing verified first login",()=>{
    const edge=readFileSync("supabase/functions/convay-users/index.ts","utf8");
    const claim=edge.indexOf('"convay_claim_pending_company_invites"');
    const final=edge.indexOf('convay_invitation_status: "accepted"');
    expect(claim).toBeGreaterThan(0);
    expect(final).toBeGreaterThan(claim);
    expect(edge).toContain("p_user_id: auth.user.id");
    expect(edge).toContain("companyClaim.meeting_access_activated !== false");
    const ui=readFileSync("src/app/pages/subscribers/SubscribersPage.tsx","utf8");
    expect(ui).toContain("Pending invitation company enrollment");
    expect(ui).toContain("Cancel pending assignment");
    expect(ui).toContain("queuePendingCompanyInvitation");
    expect(ui).toContain("listPendingCompanyInvitations");
  });
});