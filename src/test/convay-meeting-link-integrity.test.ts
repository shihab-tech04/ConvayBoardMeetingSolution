import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("supabase/migrations/20261104130000_convay_link_reference_integrity.sql", "utf8");

describe("Convay meeting link relational integrity", () => {
  it("uses deferred constraint enforcement to support one atomic parent/child batch", () => {
    expect(source).toContain("create constraint trigger convay_meeting_link_integrity");
    expect(source).toContain("deferrable initially deferred");
  });
  it("rejects orphaned meeting-agenda and meeting-participant links", () => {
    expect(source).toContain("'bms.meetingAgendaLinks','bms.meetingParticipantLinks'");
    expect(source).toContain("Meeting relationship requires an existing meeting");
    expect(source).toContain("Meeting agenda link requires an existing agenda");
    expect(source).toContain("errcode = '23503'");
  });
  it("prevents deleting a referenced meeting or agenda", () => {
    expect(source).toContain("Remove linked agendas and participants before deleting a meeting");
    expect(source).toContain("Remove meeting agenda links before deleting an agenda");
  });
  it("uses the current SQL row, rather than a stale deferred-event payload", () => {
    expect(source).toContain("select payload into v_data from public.convay_entity_records");
    expect(source).toContain("if not found then return new; end if;");
  });
});
