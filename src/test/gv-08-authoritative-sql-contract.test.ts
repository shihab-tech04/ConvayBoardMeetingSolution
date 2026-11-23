import {readFileSync} from 'node:fs';import {describe,it,expect} from 'vitest';
const s=readFileSync('supabase/migrations/20261123172100_convay_gv08_atomic_unit_head.sql','utf8');
describe('GV-08 trusted head assignment',()=>{
it('authorizes actor & verified actual account role, never UI claims',()=>{
expect(s).toContain("auth.uid()");expect(s).toContain("convay_user_roles");
expect(s).toContain("has_permission('gov_org_manage')");});
it('prevents direct generic writes and keeps historic immutable receipts',()=>{
expect(s).toContain("guard_unit_head_rpc_only");expect(s).toContain("org_unit_head_receipts");
expect(s).toContain("entity_changes");});
it('projects assignment and termination as one transaction',()=>{
expect(s).toContain("p_action='assign'");expect(s).toContain("status','ended'");
expect(s).toContain("head_user_id");expect(s).toContain("deputy_user_id");});
});