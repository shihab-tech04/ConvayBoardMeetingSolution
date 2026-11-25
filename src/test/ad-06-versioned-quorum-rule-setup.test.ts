import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  prepareVersionedQuorumRule, createVersionedQuorumRule, deactivateQuorumRule,
  type VersionedQuorumRule,
} from "../app/pages/administration/quorumRulePersistence";
import type { GovernanceBody } from "../app/data/boardMeetingData";

const body = {
  id: "GB-1", body_id: "GB-1", body_name: "Approved Board", status: "Active",
} as GovernanceBody;
const input = { rule_name: "Board quorum", governance_body_id: "GB-1", rule_type: "percentage",
  minimum_members_count: "2", minimum_percentage: "50" };
const identity = { id: "QR-1", created_at: "2026-11-23T00:00:00Z" };
const sql = readFileSync("supabase/migrations/20261123065000_convay_versioned_governance_quorum_rules.sql", "utf8");
const page = readFileSync("src/app/pages/administration/MeetingConfigPages.tsx", "utf8");

describe("AD-06/MT-04 authoritative quorum-policy creation", () => {
  it("normalizes a valid first policy for the selected active board", () => {
    const actual = prepareVersionedQuorumRule(input, identity, [body], []);
    expect(actual).toMatchObject({
      id: "QR-1", governance_body_id: "GB-1", body_name: "Approved Board",
      policy_version: 1, minimum_percentage: 50, minimum_members_count: 2,
      quorum_percent: "50%", minimum_members: "2", status: "Active",
    });
  });
  it("fails closed for unknown or inactive governance bodies", () => {
    expect(() => prepareVersionedQuorumRule(input, identity, [], [])).toThrow("active governance body");
    expect(() => prepareVersionedQuorumRule(input, identity, [{ ...body, status: "Inactive" }], []))
      .toThrow("active governance body");
  });
  it("does not accept invalid percentages, count, or unsupported policy type", () => {
    for (const patch of [
      { minimum_percentage: "101" }, { minimum_percentage: "-1" }, { minimum_percentage: "50.999" },
      { minimum_members_count: "-1" }, { minimum_members_count: "1.5" },
      { rule_type: "role_based" },
    ]) {
      expect(() => prepareVersionedQuorumRule({ ...input, ...patch }, identity, [body], [])).toThrow();
    }
  });
  it("does not overwrite an existing active rule; adds a new immutable version after deactivation", () => {
    const previous = prepareVersionedQuorumRule(input, identity, [body], []);
    expect(() => prepareVersionedQuorumRule(input, { ...identity, id: "QR-2" }, [body], [previous]))
      .toThrow("already has an active rule");
    const next = prepareVersionedQuorumRule(input, { ...identity, id: "QR-2" }, [body], [
      { ...previous, status: "Inactive" },
    ]);
    expect(next.policy_version).toBe(2);
  });
  it("requires independently confirmed SQL create and readback", async () => {
    const rows: VersionedQuorumRule[] = [];
    const gateway = {
      list: vi.fn(async () => rows),
      create: vi.fn(async (rule: VersionedQuorumRule) => { rows.push(rule); return true; }),
      update: vi.fn(async () => true),
    };
    const result = await createVersionedQuorumRule(input, identity, [body], gateway);
    expect(result.policy_version).toBe(1);
    expect(gateway.list).toHaveBeenCalledTimes(2);
    await expect(createVersionedQuorumRule(input, { ...identity, id: "QR-2" }, [body], gateway))
      .rejects.toThrow("already has an active rule");
  });
  it("rejects missing server readback and unconfirmed deactivation", async () => {
    const active = prepareVersionedQuorumRule(input, identity, [body], []);
    const gateway = {
      list: async () => [active],
      create: async () => true,
      update: async () => true,
    };
    await expect(createVersionedQuorumRule(input, identity, [body], {
      ...gateway, list: async () => [],
    })).rejects.toThrow("readback");
    await expect(deactivateQuorumRule(active.id, gateway)).rejects.toThrow("readback");
  });
  it("SQL guard rejects unauthorized, duplicate, mutated or deleted policies and protects meetings", () => {
    expect(sql).toContain("has_permission('admin_config')");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("Quorum policies are versioned and cannot be deleted");
    expect(sql).toContain("Cannot deactivate a quorum rule while meetings rely on it");
    expect(sql).toContain("An active quorum rule already exists for this body");
    expect(sql).toContain("create trigger convay_a0_versioned_quorum_policy");
  });
  it("keeps the existing approved admin page and SQL-backed permission/readback behavior", () => {
    expect(page).toContain('title: "Quorum Rules"');
    expect(page).toContain('hasAccess("admin_config", access)');
    expect(page).toContain('createVersionedQuorumRule(values');
    expect(page).toContain('deactivateQuorumRule(id, gateway)');
    expect(page).toContain('dataLoading: registry.loading || governance.loading');
  });
});
