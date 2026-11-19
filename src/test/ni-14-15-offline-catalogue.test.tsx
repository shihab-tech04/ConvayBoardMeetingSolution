import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntegrationsPage } from "../app/pages/administration/IntegrationsPage";
import { useIntegrationConnectionKpis } from "../app/pages/administration/useIntegrationConnectionKpis";

vi.mock("../app/pages/administration/useIntegrationConnectionKpis", () => ({
  useIntegrationConnectionKpis: vi.fn(),
}));

const retry = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
});

describe("NI-14/15 non-delegable integration catalogue states", () => {
  it("keeps the root's approved catalogue visible with neutral statuses when provider read fails", () => {
    vi.mocked(useIntegrationConnectionKpis).mockReturnValue({
      read: { state: "error", error: "Provider unavailable" },
      kpis: { state: "error" }, refresh: retry, allowed: true, accessReady: true,
    });
    render(<IntegrationsPage />);
    expect(screen.getByRole("heading", { name: "SMTP Email Server" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Zoom" })).toBeTruthy();
    expect(screen.getAllByText("Unverified")).toHaveLength(10);
    expect(screen.queryByText("Last synced:")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sync Now" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Filter by connection status" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Search integrations" }), { target: { value: "Zoom" } });
    expect(screen.getByRole("heading", { name: "Zoom" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "SMTP Email Server" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);
    expect(retry).toHaveBeenCalled();
  });

  it("hides every provider card and KPI from delegated or unverified users", () => {
    vi.mocked(useIntegrationConnectionKpis).mockReturnValue({
      read: { state: "ready", records: [{ id: "smtp-email", status: "Connected" }] },
      kpis: { state: "ready", counts: { total: 1, connected: 1, errors: 0, pendingSetup: 0, disconnected: 0 } },
      refresh: retry, allowed: false, accessReady: true,
    });
    render(<IntegrationsPage />);
    expect(screen.getByRole("alert").textContent).toContain("Not authorized");
    expect(screen.queryByRole("heading", { name: "SMTP Email Server" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Verified integration connection counts" })).toBeNull();
  });

  it("uses authoritative provider statuses only for records present in the verified response", () => {
    vi.mocked(useIntegrationConnectionKpis).mockReturnValue({
      read: { state: "ready", records: [{ id: "smtp-email", status: "Connected" }] },
      kpis: { state: "ready", counts: { total: 1, connected: 1, errors: 0, pendingSetup: 0, disconnected: 0 } },
      refresh: retry, allowed: true, accessReady: true,
    });
    render(<IntegrationsPage />);
    expect(screen.getByRole("heading", { name: "SMTP Email Server" })).toBeTruthy();
    expect(screen.getAllByText("Unverified")).toHaveLength(9);
    expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
  });
});
