import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/patches/convay_agenda_permission_and_state_integrity_20261123.sql", "utf8");

describe("AG-360 SQL authorization & workflow hardening", () => {
  it("permits an append-only submission ONLY with agd_submit, without granting approval", () => {
    expect(sql).toContain("convay_private.has_permission('agd_submit')");
    expect(sql).toContain("jsonb_array_length(coalesce(new.payload->'approval_history'");
    expect(sql).toContain("new.payload->'approval_history'->-1->>'action' = 'submit'");
    expect(sql).toContain("prior_payload->>'approval_status' in ('Draft', 'Incomplete', 'Reopened', 'Revision Requested')");
    expect(sql).toContain("required_codes := array_append(required_codes,approval_code)");
    expect(sql).toContain("v_ddl := replace(v_ddl,v_prior,v_revised)");
    expect(sql).toContain("RAISE EXCEPTION 'Agenda approval permission guard unexpectedly changed");
  });

  it("protects approved content independently from the client form", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION convay_private.guard_approved_agenda_content");
    expect(sql).toContain("OLD.payload->>'approval_status' = 'Approved'");
    expect(sql).toContain("Reopen an approved agenda before editing its content");
    expect(sql).toContain("BEFORE UPDATE OF payload ON public.convay_entity_records");
  });

  it("rejects non-approved, archived or incomplete agenda hierarchies from SQL meeting links", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION convay_private.guard_approved_agenda_meeting_link");
    expect(sql).toContain("v_parent->>'approval_status' <> 'Approved'");
    expect(sql).toContain("child.payload->>'approval_status' <> 'Approved'");
    expect(sql).toContain("Meeting agendas must be approved, active, and ready");
  });

  it("does not insert demo records or broaden permissions", () => {
    expect(sql).not.toMatch(/GRANT\s+(?:ALL|INSERT|UPDATE)\s+ON\s+public\.convay_entity_records/i);
    expect(sql).not.toMatch(/INSERT\s+INTO\s+public\.convay_entity_records/i);
    expect(sql).not.toContain("DISABLE TRIGGER");
  });
});
