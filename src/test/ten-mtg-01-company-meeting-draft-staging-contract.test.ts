import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql=readFileSync("supabase/migrations/20261124112000_convay_tenant_owned_meeting_draft_snapshot.sql","utf8");
const ui=readFileSync("src/app/pages/company/CompanyMeetingDraftWizard.tsx","utf8");
const company=readFileSync("src/app/pages/company/CompanyAdminWorkspacePage.tsx","utf8");
const api=readFileSync("src/app/services/saas/companyMeetingDrafts.ts","utf8");

describe("TEN-MTG-01 immutable SQL-backed company meeting drafts",()=>{
  it("never bypasses authoritative tenant ownership activation",()=>{
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS convay_private.company_meeting_draft_staging");
    expect(sql).toContain("ALTER TABLE convay_private.company_meeting_draft_staging ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON convay_private.company_meeting_draft_staging FROM PUBLIC,anon,authenticated");
    expect(sql).not.toMatch(/INSERT INTO public\.convay_entity_records/);
    expect(sql).not.toMatch(/UPDATE public\.convay_entity_records/);
    expect(sql).not.toContain("convay.authorized_meeting_reopen");
    expect(sql).not.toMatch(/UPDATE convay_private\.tenants SET lifecycle_state='active'/);
    expect(sql).not.toContain("meeting_activation_enabled',true");
  });
  it("authorizes the company and pins only its published immutable template revision",()=>{
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("convay_private.tenant_admin_authorized(p_tenant_id)");
    expect(sql).toContain("t.lifecycle_state IN ('provisioning','active')");
    expect(sql).toContain("c.tenant_id=p_tenant_id");
    expect(sql).toContain("c.published_revision=v_revision");
    expect(sql).toContain("v.state='published'");
    expect(sql).toContain("v_draft.definition IS DISTINCT FROM v_definition");
    expect(sql).toContain("jsonb_object_keys(v_values)");
    expect(sql).toContain("Unknown meeting template field:");
  });
  it("is idempotent, refuses changed intent and never activates meeting access",()=>{
    expect(sql).toContain("pg_catalog.pg_advisory_xact_lock(");
    expect(sql).toContain("v_existing.intent IS DISTINCT FROM v_intent");
    expect(sql).toContain("convay_private.tenant_meeting_draft_receipts");
    expect(sql).toContain("'meeting_activation_enabled',false");
    expect(sql).toContain("'status','Staged Draft'");
    expect(sql).not.toContain("'status','Scheduled'");
  });
  it("preserves existing meeting UI while exposing the separate staged configuration flow",()=>{
    expect(company).toContain("<CompanyMeetingDraftWizard");
    expect(company).toContain("profile.company.id");
    expect(ui).toContain("readManagedTemplate");
    expect(ui).toContain("listStagedCompanyDrafts");
    expect(ui).toContain("saveStagedCompanyDraft");
    expect(ui).toContain("No meeting, invitation or room has been created");
    expect(api).toContain("meeting_activation_enabled!==false");
    expect(api).toContain("readStagedCompanyDraft");
    expect(api).not.toContain("convay_apply_entity_batch");
  });
});
