import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageCfg } from "../app/pages/modulePageUtils";
import { NotificationRulesPage } from "../app/pages/administration/NotificationPages";

const state = vi.hoisted(() => ({
  rules: [] as Record<string, any>[],
  add: vi.fn(),
  update: vi.fn(),
  getById: vi.fn(),
  refresh: vi.fn(),
  authorized: true,
  loading: false,
  error: null as string | null,
  cfg: null as unknown as PageCfg,
}));

vi.mock("../app/data/boardMeetingData", () => ({
  useNotificationRuleRegistry: () => ({
    items: state.rules, add: state.add, update: state.update,
    getById: state.getById, refresh: state.refresh,
    loading: state.loading, error: state.error,
  }),
}));

vi.mock("../app/services/supabase/convayAccess", () => ({
  useAccessSnapshot: () => ({ loaded: true }),
  hasAccess: () => state.authorized,
}));

vi.mock("../app/components/pages/GeneratedTablePage", () => ({
  GenPage: ({ cfg }: { cfg: PageCfg }) => {
    state.cfg = cfg;
    return <section><h1>{cfg.title}</h1>
      <span data-testid="ni01-row-count">{cfg.rows.length}</span>
      <span data-testid="ni01-total">{cfg.kpis?.find(k => k.label === "Total Rules")?.value}</span>
    </section>;
  },
}));

const validRule = {
  rule_name: "Meeting reminder",
  trigger_event: "Meeting Scheduled",
  channels: "System Notification",
  recipients: "All Participants",
  timing: "Immediately",
  template: "meeting-reminder",
  entity_type: "Meeting",
};

beforeEach(() => {
  state.rules = []; state.authorized = true; state.loading = false; state.error = null;
  state.add.mockReset().mockImplementation(async (row: Record<string, any>) => {
    state.rules.push(row); return true;
  });
  state.update.mockReset().mockImplementation(async (id: string, patch: Record<string, unknown>) => {
    state.rules = state.rules.map(row => row.id === id ? { ...row, ...patch } : row);
    return true;
  });
  state.getById.mockReset().mockImplementation((id: string) => state.rules.find(row => row.id === id));
  state.refresh.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("crypto", { randomUUID: () => "c105f93c-7781-4660-ae22-7d6bda0d1708" });
});

afterEach(() => vi.unstubAllGlobals());

describe("NI-01 SQL-backed rule draft page", () => {
  it("displays only authoritative records, never the 22 synthetic rule outcomes", () => {
    render(<NotificationRulesPage />);
    expect(screen.getByText("Notification Rules")).toBeTruthy();
    expect(screen.getByTestId("ni01-row-count").textContent).toBe("0");
    expect(screen.getByTestId("ni01-total").textContent).toBe("0");
    expect(state.cfg.dataLoading).toBe(false);
    expect(state.cfg.entryBtn).toBe("Create Notification Rule");
  });

  it("creates only Draft, waits for registry acknowledgement plus refreshed readback", async () => {
    render(<NotificationRulesPage />);
    let result = false;
    await act(async () => { result = await state.cfg.onRowCreate!(validRule) as boolean; });
    expect(result).toBe(true);
    expect(state.add).toHaveBeenCalledTimes(1);
    const saved = state.add.mock.calls[0][0];
    expect(saved.status).toBe("Draft");
    expect(saved.id).toBe("c105f93c-7781-4660-ae22-7d6bda0d1708");
    expect(saved.rule_id).toBe("NR-C105F93C");
    expect(state.refresh).toHaveBeenCalledTimes(1);
  });

  it("does not claim success when a server readback is absent", async () => {
    state.getById.mockReturnValue(undefined);
    render(<NotificationRulesPage />);
    let result = true;
    await act(async () => { result = await state.cfg.onRowCreate!(validRule) as boolean; });
    expect(result).toBe(false);
  });

  it("denies unauthorized draft creation and does not call SQL transport", async () => {
    state.authorized = false;
    render(<NotificationRulesPage />);
    expect(state.cfg.entryBtn).toBeUndefined();
    const result = await state.cfg.onRowCreate!(validRule);
    expect(result).toBe(false);
    expect(state.add).not.toHaveBeenCalled();
  });

  it("holds active-rule editing and provider activation until policy verification", async () => {
    state.rules = [{
      id: "r1", rule_id: "NR-1", ...validRule, status: "Active", created_at: "",
    }];
    render(<NotificationRulesPage />);
    const actions = state.cfg.drawerActionsResolver!(state.cfg.rows[0]);
    expect(actions.find(a => a.id === "edit")?.enabled).toBe(false);
    expect(actions.find(a => a.id === "activate")?.enabled).toBe(false);
    expect(actions.find(a => a.id === "deactivate")?.enabled).toBe(false);
    const result = await state.cfg.onRowUpdate!("r1", validRule);
    expect(result).toBe(false);
    expect(state.update).not.toHaveBeenCalled();
  });

  it("rejects invalid and oversized rule payloads before backend write", async () => {
    render(<NotificationRulesPage />);
    await expect(state.cfg.onRowCreate!({ ...validRule, rule_name: "  " })).rejects.toThrow("rule name");
    await expect(state.cfg.onRowCreate!({ ...validRule, recipients: "A".repeat(181) })).rejects.toThrow("recipients");
    expect(state.add).not.toHaveBeenCalled();
  });

  it("rejects a server ACK that activates a rule instead of preserving Draft", async () => {
    state.refresh.mockImplementation(async () => {
      state.rules = state.rules.map(rule => ({ ...rule, status: "Active" }));
    });
    render(<NotificationRulesPage />);
    let result = true;
    await act(async () => { result = await state.cfg.onRowCreate!(validRule) as boolean; });
    expect(result).toBe(false);
    expect(state.add).toHaveBeenCalledTimes(1);
    expect(state.refresh).toHaveBeenCalledTimes(1);
  });

  it("rejects a server readback with mismatched rule identity", async () => {
    state.refresh.mockImplementation(async () => {
      state.rules = state.rules.map(rule => ({ ...rule, rule_id: "NR-FOREIGN" }));
    });
    render(<NotificationRulesPage />);
    let result = true;
    await act(async () => { result = await state.cfg.onRowCreate!(validRule) as boolean; });
    expect(result).toBe(false);
  });

  it("rejects a server edit ACK that silently changes the lifecycle status", async () => {
    state.rules = [{ id: "r2", rule_id: "NR-0002", ...validRule, status: "Draft", created_at: "" }];
    state.refresh.mockImplementation(async () => {
      state.rules = state.rules.map(rule => ({ ...rule, status: "Active" }));
    });
    render(<NotificationRulesPage />);
    let result = true;
    await act(async () => { result = await state.cfg.onRowUpdate!("r2", validRule) as boolean; });
    expect(result).toBe(false);
    expect(state.update).toHaveBeenCalledTimes(1);
  });

  it("denies unsupported statuses and writes while authoritative reads are unavailable", async () => {
    state.rules = [{ id: "r3", rule_id: "NR-0003", ...validRule, status: "Archived", created_at: "" }];
    render(<NotificationRulesPage />);
    expect(state.cfg.drawerActionsResolver!(state.cfg.rows[0]).find(a => a.id === "edit")?.enabled).toBe(false);
    expect(await state.cfg.onRowUpdate!("r3", validRule)).toBe(false);
    state.loading = true;
    state.error = "Permission denied";
    render(<NotificationRulesPage />);
    expect(state.cfg.entryBtn).toBeUndefined();
    expect(await state.cfg.onRowCreate!(validRule)).toBe(false);
    expect(await state.cfg.onRowUpdate!("r3", validRule)).toBe(false);
    expect(state.add).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });

  it("preserves backend loading/errors without displaying fake rows", () => {
    state.loading = true; state.error = "Permission denied";
    render(<NotificationRulesPage />);
    expect(state.cfg.dataLoading).toBe(true);
    expect(state.cfg.dataError).toBe("Permission denied");
    expect(state.cfg.rows).toHaveLength(0);
    expect(state.cfg.onDataRetry).toBe(state.refresh);
  });
});
