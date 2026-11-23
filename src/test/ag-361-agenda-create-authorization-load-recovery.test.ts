import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/pages/register-stock/Register4ListPage.tsx", "utf8");
const registry = readFileSync("src/app/hooks/useEntityRegistry.ts", "utf8");

describe("AG-361 — authorized agenda creation and load recovery", () => {
  it("uses the actual SQL agd_submit code, not an invented frontend permission", () => {
    expect(page).toContain('create:           "agd_submit"');
    expect(page).toContain('if (!hasPermission("create"))');
    expect(page).toContain('toast.error("You do not have permission to create agendas.")');
  });

  it("does not expose the Add Agenda action to read-only users or on failed loads", () => {
    expect(page).toContain('activeView === "all" && hasPermission("create") && !registry.error');
    expect(page).toContain('if (registry.loading || registry.error)');
    expect(page).toContain("setModalOpen(true)");
  });

  it("offers an accessible retry if the canonical SQL registry fails to load", () => {
    expect(page).toContain('role="alert"');
    expect(page).toContain("Agenda data could not be loaded:");
    expect(page).toContain("Retry loading");
    expect(page).toContain("registry.refresh?.().catch");
    expect(registry).toContain("if (state.loaded && !force) return;");
    expect(registry).toContain("return {");
  });

  it("does not invent success or bypass the SQL registry", () => {
    expect(page).not.toContain("localStorage.setItem");
    expect(page).not.toContain("sessionStorage.setItem");
    expect(page).toContain("useAgendaRegistry()");
    expect(page).toContain("await convayAuth.applyAgendaBatch(ops)");
  });
});
