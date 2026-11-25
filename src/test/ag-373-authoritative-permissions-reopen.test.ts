import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hasAccess, type AccessSnapshot } from "../app/services/supabase/convayAccess";

const src=readFileSync("src/app/pages/register-stock/Register4ListPage.tsx","utf8");
const empty: AccessSnapshot={
  loaded:false,error:null,is_super_admin:false,effective_permissions:[],
  user_role_ids:[],roles:[],permissions:[],user_assignments:[],
};
describe("AG-373 authoritative Agenda permissions and reject recovery",()=>{
  it("denies permissions until SQL access is loaded; checks exact assigned codes",()=>{
    expect(hasAccess("agd_submit",empty)).toBe(false);
    expect(hasAccess("agd_submit",{...empty,loaded:true,effective_permissions:["agd_review"]})).toBe(false);
    expect(hasAccess("agd_review",{...empty,loaded:true,effective_permissions:["agd_review"]})).toBe(true);
    expect(hasAccess("agd_approve",{...empty,loaded:true,is_super_admin:true})).toBe(true);
    expect(hasAccess("agd_approve",{...empty,is_super_admin:true})).toBe(false);
  });
  it("never infers Agenda authority from a potentially duplicated name or employee ID",()=>{
    expect(src).toContain("const access = useAccessSnapshot()");
    expect(src).toContain("return !!permId && hasAccess(permId, access)");
    expect(src).not.toContain("systemUsers.find(");
    expect(src).not.toContain("return myRole ===");
    expect(src).toContain('request_revision: "agd_review"'.replace(': "',': "')); // exact SQL reviewer grant
  });
  it("permits an approver to reopen rejected decisions for correction/resubmission",()=>{
    expect(src).toContain('const REOPENABLE_STATUSES = new Set(["Approved", "Rejected"])');
    expect(src).toContain('if (REOPENABLE_STATUSES.has(status) && hasPermission("reopen"))');
    expect(src).toContain('if (action === "reopen" && !REOPENABLE_STATUSES.has(item.approval_status ?? ""))');
    expect(src).toContain('const SUBMITTABLE_STATUSES    = new Set(["Draft", "Incomplete", "Reopened", "Revision Requested"])');
  });
  it("only advertises review decisions when SQL accepts a pending state",()=>{
    expect(src).toContain('const REVIEW_DECISION_STATUSES = new Set(["Pending Approval", "Pending Review", "Ready for Review", "Partially Approved"])');
    expect(src).toContain('if (REVIEW_DECISION_STATUSES.has(status) && hasPermission("approve"))');
    expect(src).toContain('if (REVIEW_DECISION_STATUSES.has(status) && hasPermission("reject"))');
    expect(src).toContain('if (REVIEW_DECISION_STATUSES.has(status) && hasPermission("request_revision"))');
    expect(src).toContain('if (action === "approve" && !REVIEW_DECISION_STATUSES.has(item.approval_status ?? ""))');
  });
});
