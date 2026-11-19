import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../../supabase/migrations/20261119183500_convay_minutes_source_integrity.sql', import.meta.url), 'utf8');

describe('MN-01 trusted SQL guards (source contract, not a substitute for SQL E2E)', () => {
  it('checks the existing source meeting using a transaction lock', () => {
    expect(sql).toContain("entity_key='bms.meetings'");
    expect(sql).toMatch(/for share/i);
    expect(sql).toContain("('completed','closed','awaiting minutes')");
  });
  it('requires a signed-in assigned actor and minutes role', () => {
    expect(sql).toContain('v_actor uuid := auth.uid()');
    expect(sql).toContain("has_permission('min_create')");
    expect(sql).toContain('is_meeting_leader(');
    expect(sql).toContain("secretary_user_id");
    expect(sql).toContain('v_source_scope is distinct from v_actor_scope');
  });
  it('protects immutable minutes references and reviewed content', () => {
    expect(sql).toContain("new.payload->>'meeting_title'");
    expect(sql).toContain("new.payload->>'meeting_date'");
    expect(sql).toContain("new.payload->>'meeting_id' is distinct from old.payload->>'meeting_id'");
    expect(sql).toContain('new.payload - v_safe_workflow_keys');
    expect(sql).toContain('v_old_status in (\'approved\',\'signed\',\'archived\')');
  });
  it('enforces the rule on direct inserts, updates and deletes, not UI alone', () => {
    expect(sql).toMatch(/before insert on public\.convay_entity_records/);
    expect(sql).toMatch(/before update on public\.convay_entity_records/);
    expect(sql).toMatch(/before delete on public\.convay_entity_records/);
    expect(sql).toContain('A meeting with linked minutes cannot be deleted');
    expect(sql).toContain('revoke all on function convay_private.enforce_minutes_source_integrity()');
  });
});
