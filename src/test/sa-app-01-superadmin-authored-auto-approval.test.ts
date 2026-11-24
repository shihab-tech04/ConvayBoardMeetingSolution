import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mock=vi.hoisted(()=>({request:vi.fn()}));
vi.mock("../app/services/supabase/convayAuth",()=>({
  convayAuth:{authenticatedRequest:mock.request},
}));
import { finalizeOwnSuperAdminContent } from "../app/services/supabase/convaySuperAdminAutoApproval";

const sql=readFileSync("supabase/migrations/20261124114500_convay_superadmin_own_content_auto_approval.sql","utf8");
const agenda=readFileSync("src/app/components/agenda/AgendaFormModal.tsx","utf8");
const agendaList=readFileSync("src/app/pages/register-stock/Register4ListPage.tsx","utf8");
const document=readFileSync("src/app/components/documents/DocumentComposerModal.tsx","utf8");
const minutes=readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx","utf8");

afterEach(()=>mock.request.mockReset());
describe("SA-APP-01 verified Super Admin auto approvals",()=>{
  it("requires active authoritative root identity, own source and original business permissions",()=>{
    expect(sql.match(/p.account_role='super_admin'/g)?.length).toBe(3);
    expect(sql.match(/p.account_status='active'/g)?.length).toBe(3);
    expect(sql).toContain("v_root.created_by IS DISTINCT FROM v_actor");
    expect(sql).toContain("v_row.created_by IS DISTINCT FROM v_actor");
    expect(sql).toContain("v_doc.created_by IS DISTINCT FROM v_actor");
    expect(sql).toContain("v_min.created_by IS DISTINCT FROM v_actor");
    expect(sql).toContain("convay_private.has_permission('agd_approve')");
    expect(sql).toContain("convay_private.has_permission('doc_approve')");
    expect(sql).toContain("convay_private.has_permission('min_approve')");
    expect(sql).toContain("SECURITY INVOKER SET search_path TO ''");
    expect(sql).not.toContain("SECURITY DEFINER");
    expect(sql).not.toMatch(/UPDATE public\.user_profiles|UPDATE public\.convay_user_roles/);
  });
  it("records agenda submit and approve for each descendant before its parent",()=>{
    expect(sql).toContain("SELECT record_id,depth FROM tree ORDER BY depth DESC,record_id");
    expect(sql).toContain("'action','submit'");
    expect(sql).toContain("'action','approve'");
    expect(sql).toContain("'meeting_readiness','Meeting Ready'");
    expect(sql).toContain("'approval_history',v_history||jsonb_build_array(v_submit,v_approve)");
    expect(sql).toContain("v_row.tenant_id IS DISTINCT FROM v_root.tenant_id");
    expect(sql).toContain("All agenda items must be saved, editable and created by this Super Admin");
    expect(agenda).toContain('finalizeOwnSuperAdminContent("agenda",parentId)');
    expect(agenda).toContain("await agendaReg.refresh?.()");
    expect(agendaList).toContain('finalizeOwnSuperAdminContent("agenda",item.parent_agenda_id||item.id)');
    expect(agendaList).toContain("submitAgendaWithHistory(");
  });
  it("requires confirmed editor content or original storage and matching document version",()=>{
    expect(sql).toContain("v_doc.payload->>'content_type'='editor'");
    expect(sql).toContain("c.content_type='editor_json' AND c.content IS NOT NULL");
    expect(sql).toContain("c.content_type='original_file'");
    expect(sql).toContain("o.bucket_id='convay-documents' AND o.name=c.storage_path");
    expect(sql).toContain("v.payload->>'version_number'=v_doc.payload->>'version'");
    expect(sql).toContain("'approval_status','Approved','workflow_status','Approved'");
    expect(document).toContain('finalizeOwnSuperAdminContent("document",confirmedId)');
    expect(document).toContain("const confirmedId = await persistAuthoredDocument");
    expect(document).toContain("const confirmedId = await persistUploadedDocument");
  });
  it("requires the server-created minutes lifecycle, without signing or voting",()=>{
    expect(sql).toContain("'Under Secretary Review','Under Chairperson Review','Member Review','Approved'");
    expect(sql).toContain("v_min.payload ? 'signed_at'");
    expect(sql).toContain("'signed',false");
    expect(sql).not.toContain("'Signed','Archived'");
    expect(minutes).toContain('finalizeOwnSuperAdminContent("minutes",minsId)');
    expect(minutes).toContain("if (readAccessSnapshot().is_super_admin)");
    expect(minutes).toContain("approval_status:    \"Draft\"");
    expect(minutes).toContain('toast.success("Minutes automatically approved; signing remains a separate action.")');
  });
  it("rejects SQL errors and unverified responses, and never treats HTTP 403 as approval",async()=>{
    mock.request.mockResolvedValueOnce(new Response(JSON.stringify({message:"Requires Super Admin"}),{status:403}));
    await expect(finalizeOwnSuperAdminContent("agenda","AGD-2026-0001"))
      .rejects.toThrow("Requires Super Admin");
    mock.request.mockResolvedValueOnce(new Response(JSON.stringify({
      agenda_id:"AGD-2026-0001",status:"Pending Approval",auto_approved:true,
    }),{status:200}));
    await expect(finalizeOwnSuperAdminContent("agenda","AGD-2026-0001"))
      .rejects.toThrow("Automatic approval SQL receipt failed verification");
    expect(mock.request).toHaveBeenCalledTimes(2);
  });
  it("accepts exact root-signed SQL receipts and rejects forged minutes signing",async()=>{
    mock.request.mockResolvedValueOnce(new Response(JSON.stringify({
      agenda_id:"AGD-2026-0001",status:"Approved",auto_approved:true,items_approved:3,
    }),{status:200}));
    await expect(finalizeOwnSuperAdminContent("agenda","AGD-2026-0001")).resolves
      .toMatchObject({status:"Approved",items_approved:3});
    mock.request.mockResolvedValueOnce(new Response(JSON.stringify({
      minutes_id:"MIN-2026-0001",status:"Approved",auto_approved:true,signed:true,
    }),{status:200}));
    await expect(finalizeOwnSuperAdminContent("minutes","MIN-2026-0001"))
      .rejects.toThrow("Automatic approval SQL receipt failed verification");
  });
});
