import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const sql = readFileSync("supabase/migrations/20261124040000_convay_agenda_hierarchy_sql_integrity.sql", "utf8");
const modal = readFileSync("src/app/components/agenda/AgendaFormModal.tsx", "utf8");
describe("AG-365 SQL-enforced Agenda hierarchy and meeting readiness", () => {
  it("forbids adding a Draft descendant to a submitted, approved, or archived parent", () => {
    expect(sql).toContain("guard_agenda_hierarchy_mutation()");
    expect(sql).toContain("Reopen the reviewed or archived parent before adding or moving children");
    expect(sql).toContain("Agenda hierarchy cannot exceed three levels");
    expect(sql).toContain("Agenda hierarchy cannot contain a cycle");
    expect(sql).toContain("Agenda parent and child must belong to the same tenant");
    expect(sql).toContain("An agenda must be created as Draft or Incomplete");
  });
  it("lets only the creator or approver remove an editable leaf child", () => {
    expect(sql).toContain("convay_agenda_author_delete_draft_child");
    expect(sql).toContain("created_by=auth.uid()");
    expect(sql).toContain("Archive parent agendas instead of deleting them");
    expect(sql).toContain("Remove descendants before deleting their parent agenda");
    expect(sql).toContain("Reopen or restore this agenda before removing it");
    expect(modal).toContain('await convayAuth.deleteAgendaChild(id, childRevision!, linkRevisions.map');
    expect(modal).toContain('const linked = linkReg.items.filter(link => link.agenda_id === id)');
  });
  it("rejects meeting linkage whenever any active grandchild needs approval", () => {
    expect(sql).toContain("guard_agenda_recursive_meeting_readiness()");
    expect(sql).toContain("WITH RECURSIVE descendants");
    expect(sql).toContain("AND NOT c.record_id=ANY(d.path)");
    expect(sql).toContain("Every active child and grandchild must be approved for meeting use");
    expect(sql).toContain("Meeting agenda link has mismatched tenant ownership");
  });
  it("preserves all live Agenda rows and existing approved UI", () => {
    expect(sql).not.toContain("DELETE FROM public.convay_entity_records");
    expect(sql).not.toContain("UPDATE public.convay_entity_records");
    expect(sql).not.toContain("SECURITY DEFINER");
    expect(sql).toContain("SECURITY INVOKER");
  });
});
