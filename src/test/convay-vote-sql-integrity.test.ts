import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261104060508_convay_vote_reference_integrity.sql","utf8");

describe("Vote records SQL referential integrity", () => {
  it("uniquely identifies each voter ballot within one meeting", () => {
    expect(sql).toContain("create unique index if not exists convay_vote_unique_meeting_ballot");
    expect(sql).toContain("(payload->>'meeting_id'), (payload->>'vote_id')");
    expect(sql).toContain("where entity_key='bms.votes'");
  });

  it("rejects vote records with nonexistent meeting references or empty vote IDs", () => {
    expect(sql).toContain("referenced_meeting:=nullif(btrim(current_vote->>'meeting_id'),'')");
    expect(sql).toContain("nullif(btrim(current_vote->>'vote_id'),'') is null");
    expect(sql).toContain("Voting record requires a real meeting and vote identifier");
  });

  it("does not allow meetings with recorded votes to be deleted", () => {
    expect(sql).toContain("Cannot delete a meeting while its votes still exist");
    expect(sql).toContain("errcode='23503'");
  });

  it("uses a deferred constraint with a private helper to permit atomic meeting creation", () => {
    expect(sql).toContain("deferrable initially deferred");
    expect(sql).toContain("security definer set search_path=''");
    expect(sql).toContain("revoke all on function convay_private.enforce_vote_reference_integrity()");
  });
});
