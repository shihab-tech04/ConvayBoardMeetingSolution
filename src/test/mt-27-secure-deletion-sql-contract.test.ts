import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
const sql = readFileSync(resolve(process.cwd(),
  "supabase/migrations/20261123170000_convay_draft_meeting_secure_deletion.sql"),"utf8");
describe("MT-27 secure backend draft deletion", () => {
 it("requires authorized active actor, role permission and creator or Super Admin", () => {
  expect(sql).toContain("v_actor uuid := auth.uid()");
  expect(sql).toContain("u.account_status='active'");
  expect(sql).toContain("registry_authorized('bms.meetings','delete')");
  expect(sql).toContain("v_meeting.created_by is distinct from v_actor");
 });
 it("holds the record, compares revision and refuses non-draft lifecycle", () => {
  expect(sql).toMatch(/for update/i);
  expect(sql).toContain("v_meeting.revision <> p_expected_revision");
  expect(sql).toContain("lower(coalesce(v_meeting.payload->>'approval_status','')) <> 'draft'");
  expect(sql).toContain("Tenant-owned deletion is not activated");
 });
 it("rejects orphaned evidence and preserves full restore receipts", () => {
  expect(sql).toContain("source_meeting_id");
  expect(sql).toContain("Draft has retained governance evidence");
  expect(sql).toContain("linked_snapshot");
  expect(sql).toContain("convay_private.meeting_draft_deletion_receipts");
 });
 it("rejects generic meeting DELETE and keeps a bounded idempotent ACK", () => {
  expect(sql).toContain("convay_a0_meeting_delete_rpc_only");
  expect(sql).toContain("pg_advisory_xact_lock");
  expect(sql).toContain("'outcome','already_deleted'");
  expect(sql).toContain("'outcome','deleted'");
 });
});
