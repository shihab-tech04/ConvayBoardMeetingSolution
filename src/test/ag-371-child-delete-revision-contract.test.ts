import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { convayAuth } from "../app/services/supabase/convayAuth";

const sql = readFileSync(
  "supabase/migrations/20261124102000_convay_agenda_revision_checked_child_delete.sql", "utf8",
);
const modal = readFileSync("src/app/components/agenda/AgendaFormModal.tsx", "utf8");
afterEach(() => vi.restoreAllMocks());

describe("AG-371 atomic revision-checked child-and-document removal", () => {
  it("locks the child and every expected linked document, then compares the entire SQL link set", () => {
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).not.toContain("SECURITY DEFINER");
    expect(sql).toContain("v_child.revision IS DISTINCT FROM p_expected_revision");
    expect(sql).toContain("v_link.revision IS DISTINCT FROM v_expected");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("v_actual IS DISTINCT FROM v_ids");
    expect(sql).toContain("SELECT public.convay_apply_entity_batch(v_ops) INTO v_count");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.convay_delete_agenda_child(text,bigint,jsonb)");
    expect(sql).toContain("TO authenticated");
  });
  it("preserves the parent and nested hierarchy, and rejects meeting-linked child deletion", () => {
    expect(sql).toContain("Reopen the parent before removing child Agenda items");
    expect(sql).toContain("Remove nested descendants before their parent Agenda child");
    expect(sql).toContain("Unlink this Agenda from its meeting before removing it");
    expect(sql).toContain("Only an editable child Agenda may be removed");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.convay_entity_records/i);
    expect(modal).toContain("childRevision = agendaReg.getRevision?.(id)");
    expect(modal).toContain("linkReg.getRevision?.(link.id)");
    expect(modal).toContain("await convayAuth.deleteAgendaChild(id, childRevision!,");
    expect(modal).not.toContain("await convayAuth.applyBatch(operations)");
  });
  it("transmits only exact, validated optimistic-concurrency SQL arguments", async () => {
    const request = vi.spyOn(convayAuth, "authenticatedRequest").mockResolvedValue(
      new Response("2", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    await expect(convayAuth.deleteAgendaChild("AGD-2", 4,
      [{ recordId: "ADL-1", expectedRevision: 8 }])).resolves.toBe(2);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toBe("/rest/v1/rpc/convay_delete_agenda_child");
    expect(JSON.parse(request.mock.calls[0][1]?.body as string)).toEqual({
      p_child_id: "AGD-2",
      p_expected_revision: 4,
      p_link_revisions: [{ record_id: "ADL-1", expected_revision: 8 }],
    });
  });
  it("rejects missing, stale, duplicate and unacknowledged removals", async () => {
    const request = vi.spyOn(convayAuth, "authenticatedRequest").mockResolvedValue(
      new Response("0", { status: 200 }),
    );
    await expect(convayAuth.deleteAgendaChild("AGD-2", 0, [])).rejects.toThrow(/stale/i);
    await expect(convayAuth.deleteAgendaChild("AGD-2", 1, [
      { recordId: "ADL-1", expectedRevision: 1 },
      { recordId: "ADL-1", expectedRevision: 2 },
    ])).rejects.toThrow(/stale/i);
    expect(request).not.toHaveBeenCalled();
    await expect(convayAuth.deleteAgendaChild("AGD-2", 1, []))
      .rejects.toThrow(/not completely confirmed/i);
  });
});
