import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageCfg } from "../app/pages/modulePageUtils";
import { MessageTemplatesPage } from "../app/pages/administration/NotificationPages";

const captures = vi.hoisted(() => ({
  cfg: null as unknown as PageCfg,
  toastInfo: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { info: captures.toastInfo } }));
vi.mock("../app/components/pages/GeneratedTablePage", () => ({
  GenPage: ({ cfg }: { cfg: PageCfg }) => {
    captures.cfg = cfg;
    return <section>
      <h1>{cfg.title}</h1>
      <p>{cfg.desc}</p>
      <span data-testid="template-rows">{cfg.rows.length}</span>
      <span data-testid="template-kpis">{cfg.kpis?.map(k => k.label + ": " + k.value).join("; ")}</span>
      <button onClick={() => cfg.onEntryBtnClick?.()}>{cfg.entryBtn}</button>
    </section>;
  },
}));

beforeEach(() => captures.toastInfo.mockClear());

describe("NI-02 message template evidence truthfulness", () => {
  it("does not display 24 generated records as real provider templates", () => {
    render(<MessageTemplatesPage />);
    expect(screen.getByTestId("template-rows").textContent).toBe("0");
    expect(screen.getByTestId("template-kpis").textContent).toContain("Template evidence: Unverified");
    expect(screen.getByText(/Server-backed communication message templates are not connected/)).toBeTruthy();
    expect(captures.cfg.cols.length).toBe(7);
    expect(captures.cfg.drawerCols?.length).toBeGreaterThan(0);
  });

  it("preserves visible Create action but refuses fake local persistence", () => {
    render(<MessageTemplatesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Create Message Template" }));
    expect(captures.toastInfo).toHaveBeenCalledWith(expect.stringContaining("cannot be saved"));
    expect(captures.cfg.onRowCreate).toBeUndefined();
  });

  it("keeps unsupported edit, preview, activation, duplication and archive unavailable", () => {
    render(<MessageTemplatesPage />);
    expect(captures.cfg.drawerActions?.map(a => a.id)).toEqual([
      "edit", "preview", "activate", "duplicate", "archive",
    ]);
    for (const action of captures.cfg.drawerActions ?? []) {
      expect(action.enabled).toBe(false);
      expect(action.disabledReason).toBeTruthy();
    }
    expect(captures.cfg.rows).toHaveLength(0);
  });
});
