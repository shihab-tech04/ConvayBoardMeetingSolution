import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createVersionedQuorumRule, prepareVersionedQuorumRule,
  type VersionedQuorumRule, type QuorumRuleGateway,
} from "../app/pages/administration/quorumRulePersistence";
import type { GovernanceBody } from "../app/data/boardMeetingData";

const migration = readFileSync(
  "supabase/migrations/20261123101000_convay_quorum_snapshot_safeupdate.sql", "utf8",
);
const previousGuard = readFileSync(
  "supabase/migrations/20261123065000_convay_versioned_governance_quorum_rules.sql", "utf8",
);

const body = {
  id: "GB-2026-0001", body_id: "GB-2026-0001",
  body_name: "Shihab. 01", status: "Active",
} as GovernanceBody;
const values = {
  rule_name: "quaram rule 1", governance_body_id: body.id,
  rule_type: "fixed_number", minimum_members_count: "01", minimum_percentage: "1",
  count_virtual_attendance: true, count_alternate_members: false,
  exclude_recused_members: true,
};
const identity = { id: "QR-2026-0001", created_at: "2026-11-23T09:28:00.000Z" };

describe("AD-06: fix live quorum-policy POST rejection without weakening governance", () => {
  it("preserves all-snapshot invalidation using a meaningful predicate on the NOT NULL meeting ID", () => {
    expect(migration).toContain("create or replace function convay_private.invalidate_live_quorum_on_scope_change()");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toMatch(/if v_entity='bms\.quorumrules' then\s+update convay_private\.live_quorum_snapshots\s+set met=false,revision=revision\+1,updated_at=now\(\)\s+where meeting_id is not null;/);
    expect(migration).toContain("where meeting_id in (v_mid_old,v_mid_new)");
    expect(migration).toContain("if v_enabled is not true then");
    expect(migration).not.toMatch(/\btruncate\b|\bdelete from\b|\bgrant\b/i);
    expect(previousGuard).toContain("Quorum policies are versioned and cannot be deleted");
  });

  it("normalizes the screenshot's fixed-number inputs for the existing strict SQL guard", () => {
    const intended = prepareVersionedQuorumRule(values, identity, [body], []);
    expect(intended).toMatchObject({
      id: identity.id, rule_id: identity.id, policy_version: 1,
      minimum_members_count: 1, minimum_percentage: 1,
      minimum_members: "1", quorum_percent: "1%",
      rule_type: "fixed_number", status: "Active",
    });
  });

  it("requires the SQL ACK plus independent readback before reporting save success", async () => {
    const saved: VersionedQuorumRule[] = [];
    const gateway: QuorumRuleGateway = {
      list: async () => [...saved],
      create: async rule => { saved.push(rule); return true; },
      update: async () => false,
    };
    const accepted = await createVersionedQuorumRule(values, identity, [body], gateway);
    expect(accepted.rule_id).toBe(identity.id);
    expect(saved).toHaveLength(1);
    await expect(createVersionedQuorumRule(values, { ...identity, id: "QR-2026-0002" }, [body], gateway))
      .rejects.toThrow("already has an active rule");
  });

  it("never converts a failed SQL ACK into a fictitious successful policy", async () => {
    const gateway: QuorumRuleGateway = {
      list: async () => [],
      create: async () => false,
      update: async () => false,
    };
    await expect(createVersionedQuorumRule(values, identity, [body], gateway))
      .rejects.toThrow("not acknowledged by SQL");
  });
});
