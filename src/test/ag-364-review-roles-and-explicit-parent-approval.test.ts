import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const agenda = readFileSync("src/app/pages/register-stock/Register4ListPage.tsx", "utf8");
const sql = readFileSync("supabase/migrations/20261124025000_convay_agenda_role_and_explicit_parent_approval.sql", "utf8");

describe("AG-364 separate Agenda author, reviewer, approver and parent signoff", () => {
  it("never silently marks a parent approved when the final child is approved", () => {
    expect(agenda).toContain('if (allApproved) return alreadyApproved ? "Approved" : "Pending Approval";');
    expect(agenda).toContain('return parentStatus;');
    expect(agenda).toContain('["Draft", "Incomplete", "Reopened", "Revision Requested", "Rejected"].includes(parentStatus)');
    expect(agenda).toContain('const alreadyApproved = parentStatus === "Approved";');
    expect(sql).toContain("Agenda approval requires an explicit approver decision");
    expect(sql).toContain("Submit an agenda for review before approval");
    expect(sql).toContain("Approve all active child agendas before approving their parent");
  });

  it("matches action controls to SQL roles, including reviewer-only revision requests", () => {
    expect(agenda).toContain('request_revision: "agd_review"');
    expect(agenda).toContain('if (action === "request_revision" && myPermissions.includes("agd_approve"))');
    expect(agenda).toContain('const permitted = hasPermission(action);');
    expect(agenda).toContain('const canSubmit = SUBMITTABLE_STATUSES.has(status) && hasPermission("submit");');
    expect(agenda).toContain('if (action !== "request_revision" || hasPermission("approve")) cascadeStatusUp');
    expect(sql).toContain("('Agenda Author','agd_submit')");
    expect(sql).toContain("('Agenda Reviewer','agd_review')");
    expect(sql).toContain("('Agenda Approver','agd_approve')");
  });

  it("limits the additional review RLS policy to Agenda rows and prevents reviewer content edits", () => {
    expect(sql).toContain("CREATE POLICY convay_agenda_authorized_review_update");
    expect(sql).toContain("entity_key='bms.agenda'");
    expect(sql).toContain("AND (convay_private.has_permission('agd_review') OR convay_private.has_permission('agd_approve'))");
    expect(sql).toContain("Agenda reviewer cannot change content");
    expect(sql).toContain("Agenda archiving requires approver permission");
    expect(sql).toContain("Agenda approver permission required for this transition");
    expect(sql).toContain("Agenda tenant cannot change through ordinary editing");
    expect(sql).toContain("convay_private.enforce_entity_state_transition()");
    expect(sql).toContain("new.payload->'approval_history'->-1->>'action'='request_revision'");
    expect(sql).not.toContain("SECURITY DEFINER");
  });

  it("does not reassign user roles, mutate the 3 original agendas or alter other registry permissions", () => {
    expect(sql).not.toContain("UPDATE public.convay_user_roles");
    expect(sql).not.toContain("UPDATE public.convay_entity_records");
    expect(sql).not.toContain("DELETE FROM public.convay_entity_records");
    expect(sql).toContain("ON public.convay_entity_records FOR UPDATE TO authenticated");
  });
});
