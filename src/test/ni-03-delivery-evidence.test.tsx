import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PageCfg } from "../app/pages/modulePageUtils";
import { DeliveryLogsPage } from "../app/pages/administration/NotificationPages";

vi.mock("../app/components/pages/GeneratedTablePage", () => ({
  GenPage: ({ cfg }: { cfg: PageCfg }) => (
    <section>
      <p>{cfg.desc}</p>
      <span data-testid="delivery-row-count">{cfg.rows.length}</span>
      <span data-testid="delivery-kpis">{cfg.kpis?.map(k => `${k.label}: ${k.value}`).join("; ")}</span>
      {cfg.drawerActions?.map(action => (
        <button key={action.id} disabled={action.enabled === false} title={action.disabledReason}>
          {action.label}
        </button>
      ))}
    </section>
  ),
}));

describe("NI-03 delivery log evidence safety", () => {
  it("does not represent fabricated delivery events as provider audit evidence", () => {
    render(<DeliveryLogsPage />);
    expect(screen.getByTestId("delivery-row-count").textContent).toBe("0");
    expect(screen.getByTestId("delivery-kpis").textContent).toContain("Delivery evidence: Unverified");
    expect(screen.getByText(/Provider-backed delivery logs are not connected/)).toBeTruthy();
    expect(screen.getByTestId("delivery-kpis").textContent).not.toContain("Delivery Rate");
  });

  it("keeps provider retry and export unavailable until verified implementations exist", () => {
    render(<DeliveryLogsPage />);
    const retry = screen.getByRole("button", { name: "Retry Delivery" });
    const exportLog = screen.getByRole("button", { name: "Export Log" });
    expect(retry.hasAttribute("disabled")).toBe(true);
    expect(exportLog.hasAttribute("disabled")).toBe(true);
    expect(retry.getAttribute("title")).toContain("No authenticated provider retry");
    expect(exportLog.getAttribute("title")).toContain("No verified delivery records");
  });
});
