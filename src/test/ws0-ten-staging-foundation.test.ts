import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const sql = readFileSync("supabase/migrations/20261123162000_convay_ten_private_foundation_staging.sql", "utf8");
describe("TEN staging foundation remains non-activated and preserves legacy data", () => {
  it("creates only private tenant and membership tables with RLS", () => {
    expect(sql).toContain("create table convay_private.tenants");
    expect(sql).toContain("create table convay_private.tenant_memberships");
    expect(sql).toContain("alter table convay_private.tenants enable row level security");
    expect(sql).toContain("alter table convay_private.tenant_memberships enable row level security");
  });
  it("adds a nullable tenant column without default/backfill or authentication changes", () => {
    expect(sql).toMatch(/add column tenant_id uuid\s*;/i);
    expect(sql).not.toMatch(/add column tenant_id uuid not null/i);
    expect(sql).not.toMatch(/update public\.convay_entity_records/i);
    expect(sql).not.toMatch(/create policy.+convay_entity_records/i);
  });
});
