import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntegrationsPage } from "../app/pages/administration/IntegrationsPage";
import { useIntegrationConnectionKpis } from "../app/pages/administration/useIntegrationConnectionKpis";

vi.mock("../app/pages/administration/useIntegrationConnectionKpis", () => ({
  useIntegrationConnectionKpis: vi.fn(),
}));

const refresh = vi.fn();
beforeEach(() => vi.clearAllMocks());

describe("NI-14/NI-15 provider action integrity", () => {
  it("refreshes observed provider status without claiming to trigger provider synchronization", () => {
    vi.mocked(useIntegrationConnectionKpis).mockReturnValue({
      read: {
        state: "ready",
        records: [
          { id: "smtp-email", status: "Connected" },
          { id: "ms-teams", status: "Disconnected" },
          { id: "sms-gateway", status: "Error" },
          { id: "google-workspace", status: "Pending Setup" },
        ],
      },
      kpis: { state: "ready", counts: { total: 10, connected: 1, errors: 1, pendingSetup: 7, disconnected: 1 } },
      refresh,
      allowed: true,
      accessReady: true,
    });

    render(<IntegrationsPage />);
    const statusRefreshes = screen.getAllByRole("button", { name: "Refresh Status" });
    expect(statusRefreshes).toHaveLength(2);
    statusRefreshes.forEach(button => fireEvent.click(button));
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Sync Now" })).toBeNull();

    for (const name of ["Configure", "Connect", "Diagnose", "Setup Integration"]) {
      const button = screen.getByRole("button", { name });
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(button.getAttribute("title")).toContain("not configured");
    }

    const docs = screen.getAllByRole("button", { name: "Documentation unavailable" });
    expect(docs).toHaveLength(4);
    expect(docs.every(button => button.hasAttribute("disabled"))).toBe(true);
  });

  it("does not show operational provider actions for unverified or unauthorized status", () => {
    vi.mocked(useIntegrationConnectionKpis).mockReturnValue({
      read: { state: "error", error: "Provider read unavailable" },
      kpis: { state: "error" },
      refresh,
      allowed: true,
      accessReady: true,
    });
    const { rerender } = render(<IntegrationsPage />);
    expect(screen.queryByRole("button", { name: "Refresh Status" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();

    vi.mocked(useIntegrationConnectionKpis).mockReturnValue({
      read: { state: "ready", records: [{ id: "smtp-email", status: "Connected" }] },
      kpis: { state: "ready", counts: { total: 1, connected: 1, errors: 0, pendingSetup: 0, disconnected: 0 } },
      refresh,
      allowed: false,
      accessReady: true,
    });
    rerender(<IntegrationsPage />);
    expect(screen.queryByRole("button", { name: "Refresh Status" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "SMTP Email Server" })).toBeNull();
  });
});
