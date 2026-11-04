import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261104181406_convay_ballot_eligibility_append_only.sql", "utf8");

describe("PT-07 / VT-07 / BR-11: SQL-backed eligible ballot records", () => {
  it("enforces one recorded ballot per real voter per voting session", () => {
    expect(sql).toContain("create unique index if not exists convay_unique_ballot_voter_session");
    expect(sql).toContain("(payload->>'ballot_session_id'),(payload->>'voter_id')");
    expect(sql).toContain("where entity_key='bms.votes'");
  });
  it("requires a canonical meeting link and a real Auth user marked voting eligible", () => {
    expect(sql).toContain("link.entity_key='bms.meetingParticipantLinks'");
    expect(sql).toContain("link.payload->>'meeting_id'=v_meeting");
    expect(sql).toContain("link.payload->>'voting_eligible'='true'");
    expect(sql).toContain("auth.users u where u.id::text=v_voter");
  });
  it("permits own ballots but only authorized leadership may record proxy ballots", () => {
    expect(sql).toContain("v_voter<>v_actor::text and not convay_private.has_permission('mtg_start')");
    expect(sql).toContain("convay_private.has_permission('mtg_join')");
    expect(sql).toContain("Only authorized leadership may record proxy ballots");
  });
  it("requires host permission for a vote summary and never identifies secret voters", () => {
    expect(sql).toContain("'Secret Ballot (anonymised)'");
    expect(sql).toContain("v_voter is not null or not convay_private.has_permission('mtg_start')");
    expect(sql).toContain("Meeting leadership permission required for vote summary");
  });
  it("prevents ordinary authenticated users from modifying official voting evidence", () => {
    expect(sql).toContain("if tg_op in ('UPDATE','DELETE') then");
    expect(sql).toContain("Official voting records are immutable");
    expect(sql).toContain("errcode='42501'");
  });
  it("limits elevated trigger execution to an internal private-schema function", () => {
    expect(sql).toContain("convay_private.enforce_ballot_eligibility()");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("revoke all on function convay_private.enforce_ballot_eligibility()");
    expect(sql).toContain("before insert or update or delete on public.convay_entity_records");
  });
});