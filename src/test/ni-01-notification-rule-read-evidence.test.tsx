import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageCfg } from "../app/pages/modulePageUtils";
import { NotificationRulesPage } from "../app/pages/administration/NotificationPages";

const state = vi.hoisted(() => ({
  access: { loaded: true, is_super_admin: true },
  authorized: true,
  items: [] as Record<string, unknown>[],
  loading: false,
  error: null as string | null,
  cfg: null as unknown as PageCfg,
  read: vi.fn(), refresh: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn(), info: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { info: state.info } }));
vi.mock("../app/services/supabase/convayAccess", () => ({
  useAccessSnapshot: () => state.access, readAccessSnapshot: () => state.access,
  hasAccess: () => state.authorized,
}));
vi.mock("../app/data/boardMeetingData", () => ({ useNotificationRuleRegistry: () => {
  state.read();
  return { items: state.items, loading: state.loading, error: state.error,
    refresh: state.refresh, add: state.add, update: state.update, remove: state.remove };
} }));
vi.mock("../app/components/pages/GeneratedTablePage", () => ({
  GenPage: ({ cfg }: { cfg: PageCfg }) => {
    state.cfg = cfg;
    return <section><h1>{cfg.title}</h1>
      <span data-testid="rows">{cfg.rows.length}</span>
      <button onClick={() => cfg.onEntryBtnClick?.()}>{cfg.entryBtn}</button>
    </section>;
  },
}));
beforeEach(() => {
  state.access = { loaded: true, is_super_admin: true }; state.authorized = true;
  state.items = []; state.loading = false; state.error = null;
  vi.clearAllMocks(); state.refresh.mockResolvedValue(undefined);
});
const record = { id: "actual-id", rule_id: "NR-REAL", rule_name: "Saved draft", status: "Draft", channels: "Email", recipients: "Owner", timing: "Immediately" };
describe("NI-01 read evidence preserved in draft lifecycle candidate", () => {
  it("reports the actual empty registry rather than the generated 22 rules", () => {
    render(<NotificationRulesPage />);
    expect(screen.getByTestId("rows").textContent).toBe("0");
    expect(state.cfg.kpis?.find(k => k.label === "Total Rules")?.value).toBe("0");
  });
  it("maps authoritative records and counts, with delivery lifecycle actions still unavailable", () => {
    state.items = [record]; render(<NotificationRulesPage />);
    expect(state.cfg.rows).toEqual([{ ...record, channel: "Email", audience: "Owner", delay_minutes: "Immediately" }]);
    expect(state.cfg.kpis?.find(k => k.label === "Draft")?.value).toBe("1");
    const actions = state.cfg.drawerActionsResolver!(state.cfg.rows[0]);
    expect(actions.map(a => a.id)).toEqual(["edit", "activate", "deactivate", "duplicate", "archive"]);
    for (const id of ["activate", "deactivate", "archive"]) {
      expect(actions.find(a => a.id === id)?.enabled).toBe(false);
    }
    expect(actions.find(a => a.id === "edit")?.enabled).toBe(true);
    expect(actions.find(a => a.id === "duplicate")?.enabled).toBe(true);
    expect(state.cfg.entryBtn).toBe("Create Notification Rule");
    expect(typeof state.cfg.onRowCreate).toBe("function");
    expect(typeof state.cfg.onRowUpdate).toBe("function");
    expect(state.add).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled(); expect(state.remove).not.toHaveBeenCalled();
  });
  it("does not mount the registry for a delegated non-root or unloaded session", () => {
    state.access = { loaded: true, is_super_admin: false };
    const view = render(<NotificationRulesPage />);
    expect(state.read).not.toHaveBeenCalled(); expect(screen.queryByText("Notification Rules")).toBeNull();
    state.access = { loaded: false, is_super_admin: true }; view.rerender(<NotificationRulesPage />);
    expect(state.read).not.toHaveBeenCalled();
  });
  it("hides cached records and totals when refresh fails and gates retry on current access", () => {
    state.items = [record]; state.error = "Read failed"; state.loading = true;
    const view = render(<NotificationRulesPage />);
    expect(state.cfg.rows).toHaveLength(0);
    expect(state.cfg.kpis).toEqual([{ label: "Rule evidence", value: "Unverified", tone: "warning" }]);
    expect(state.cfg.dataError).toBe("Read failed"); expect(state.cfg.dataLoading).toBe(true);
    const retry = state.cfg.onDataRetry!; retry(); expect(state.refresh).toHaveBeenCalledTimes(1);
    state.access = { loaded: true, is_super_admin: false }; view.rerender(<NotificationRulesPage />);
    retry(); expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Notification Rules")).toBeNull();
  });
});
