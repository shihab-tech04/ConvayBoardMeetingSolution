import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const sql = readFileSync("supabase/migrations/20261123102123_convay_ten_private_foundation_staging.sql", "utf8");
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

describe("TEN staging guard denies forged ownership while tenant activation is OFF", () => {
  const guard = readFileSync("supabase/migrations/20261123102350_convay_ten_staging_ownership_claim_guard.sql", "utf8");
  it("rejects non-null client tenant IDs and subsequent mutations", () => {
    expect(guard).toContain("tg_op = 'INSERT' and new.tenant_id is not null");
    expect(guard).toContain("tg_op = 'UPDATE' and new.tenant_id is distinct from old.tenant_id");
    expect(guard).toContain("errcode = '42501'");
    expect(guard).toContain("before insert or update on public.convay_entity_records");
    expect(guard).toContain("revoke all on function");
  });
});
