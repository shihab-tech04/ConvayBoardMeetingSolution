
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const sql=readFileSync('supabase/migrations/20261123172000_convay_gv06_atomic_org_unit_move.sql','utf8');
describe('GV-06 authoritative SQL move',()=>{
 it('is an actor + role bound RPC, not generic batch writes',()=>{
  expect(sql).toContain("auth.uid()");
  expect(sql).toContain("has_permission('gov_org_manage')");
  expect(sql).toContain("guard_org_hierarchy_rpc_only");
 });
 it('proves real ancestry, locking and immutable audit',()=>{
  expect(sql).toContain('pg_advisory_xact_lock');
  expect(sql).toContain('with recursive ancestor');
  expect(sql).toContain('with recursive paths');
  expect(sql).toContain('convay_private.entity_changes');
 });
 it('does not activate tenant writes or anonymous execution',()=>{
  expect(sql).toContain('Tenant-owned unit movement not activated');
  expect(sql).toContain('to authenticated;');
  expect(sql).toContain('from public,anon,authenticated;');
 });
});
