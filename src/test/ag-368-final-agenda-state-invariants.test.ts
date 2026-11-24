import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const sql = readFileSync(
  "supabase/migrations/20261124083000_convay_final_agenda_ancestor_consistency.sql",
  "utf8"
);
describe("AG-368 final committed Agenda lifecycle consistency", () => {
  it("defers checks until after an atomic child-and-parent cascade", () => {
    expect(sql).toContain("CREATE CONSTRAINT TRIGGER convay_c1_final_agenda_ancestors");
    expect(sql).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(sql).toContain("WHERE entity_key='bms.agenda' AND record_id=NEW.record_id");
    expect(sql).toContain("Approved parent has an unapproved active descendant");
    expect(sql).toContain("Approved agenda must have Meeting Ready status");
  });
  it("does not allow linked agendas to silently lose readiness", () => {
    expect(sql).toContain("l.entity_key='bms.meetingAgendaLinks'");
    expect(sql).toContain("l.payload->>'agenda_id'=ANY(v_chain)");
    expect(sql).toContain("Unlink this agenda from its meeting before reopening");
  });
  it("guards hierarchy identity, cycles and company boundaries", () => {
    expect(sql).toContain("v_parent_id=ANY(v_seen)");
    expect(sql).toContain("v_parent.tenant_id IS DISTINCT FROM v_current.tenant_id");
    expect(sql).toContain("CARDINALITY(v_seen)>3");
    expect(sql).toContain("SECURITY DEFINER SET search_path TO ''");
    expect(sql).toContain("FROM PUBLIC,anon,authenticated");
  });
  it("does not rewrite legacy Agenda content or unrelated entities", () => {
    expect(sql).not.toMatch(/UPDATE public\.convay_entity_records\s+SET/i);
    expect(sql).not.toContain("TRUNCATE");
    expect(sql).toContain("WHEN (NEW.entity_key='bms.agenda')");
  });
});
