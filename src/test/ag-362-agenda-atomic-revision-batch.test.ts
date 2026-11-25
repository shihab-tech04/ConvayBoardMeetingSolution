import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261124005000_convay_agenda_revision_checked_batch.sql", "utf8");
const auth = readFileSync("src/app/services/supabase/convayAuth.ts", "utf8");
const page = readFileSync("src/app/pages/register-stock/Register4ListPage.tsx", "utf8");
const cache = readFileSync("src/app/hooks/useEntityRegistry.ts", "utf8");

describe("AG-362 revision-checked Agenda lifecycle", () => {
  it("requires the signed-in invoker and enforces current SQL revision under a row lock", () => {
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).toContain("IF (SELECT auth.uid()) IS NULL");
    expect(sql).toContain("v_op->'expected_revision'");
    expect(sql).toContain("FOR UPDATE;");
    expect(sql).toContain("v_actual IS DISTINCT FROM v_expected");
    expect(sql).toContain("USING ERRCODE='40001'");
  });

  it("allows only authenticated Agenda updates with no duplicates and full rollback", () => {
    expect(sql).toContain("v_op->>'entity_key' IS DISTINCT FROM 'bms.agenda'");
    expect(sql).toContain("v_op->>'action' IS DISTINCT FROM 'update'");
    expect(sql).toContain("v_id = ANY(v_seen)");
    expect(sql).toContain("SELECT public.convay_apply_entity_batch(p_ops) INTO v_processed");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.convay_apply_agenda_batch(jsonb) FROM PUBLIC, anon");
    expect(sql).toContain("TO authenticated");
    expect(sql).not.toContain("SECURITY DEFINER");
  });

  it("uses SQL revisions for approval cascade and archive, not optimistic client success", () => {
    expect(cache).toContain("getRevision?: (id: string) => number | undefined;");
    expect(cache).toContain("getRevision, refresh");
    expect(page).toContain("expected_revision: requireAgendaRevision(agendaId)");
    expect(page).toContain("expected_revision: requireAgendaRevision(parentId)");
    expect(page).toContain("expected_revision: requireAgendaRevision(row.id)");
    expect(page).toContain("await convayAuth.applyAgendaBatch(ops)");
    expect(page).toContain("await convayAuth.applyAgendaBatch(members.map");
    expect(page).toContain("await registry.refresh?.()");
  });

  it("distinguishes denied SQL transactions from success", () => {
    expect(auth).toContain('"/rest/v1/rpc/convay_apply_agenda_batch"');
    expect(auth).toContain('if (!res.ok) throw new Error(errorMessage(await responseBody(res)');
    expect(auth).toContain('Agenda transaction was not fully confirmed by SQL.');
  });
});
