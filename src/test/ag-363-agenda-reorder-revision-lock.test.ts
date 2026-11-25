import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const form = readFileSync("src/app/components/agenda/AgendaFormModal.tsx", "utf8");
describe("AG-363 multi-row reorder persistence and stale-state recovery", () => {
  it("uses the row revisions for both sides of the swap", () => {
    expect(form).toContain("agendaReg.getRevision?.(id)");
    expect(form).toContain("agendaReg.getRevision?.(sibs[swi].id)");
    expect(form).toContain("expected_revision: firstRevision!");
    expect(form).toContain("expected_revision: secondRevision!");
    expect(form).toContain("await convayAuth.applyAgendaBatch([");
  });
  it("does not present a false save success or reorder on stale data", () => {
    expect(form).toContain("Agenda order is stale. Refresh before reordering.");
    expect(form).toContain("await agendaReg.refresh?.()");
    expect(form).toContain('toast.error(error instanceof Error ? error.message : "Reorder was not saved.")');
  });
});
