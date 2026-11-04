import { describe, expect, it, vi } from "vitest";
import { resolveDashboardDataState, retryDashboardSources } from "../app/pages/dashboard/dashboardRegistryHealth";

describe("HM-01 executive dashboard data availability", () => {
  it("does not turn pending SQL reads into a false empty overview", () => {
    expect(resolveDashboardDataState([{ loading: false }, { loading: true }])).toBe("loading");
  });

  it("prioritizes failed SQL reads over incomplete results", () => {
    expect(resolveDashboardDataState([{ loading: true }, { error: "Database unavailable" }])).toBe("error");
  });

  it("allows genuine empty results only when every registry has loaded", () => {
    expect(resolveDashboardDataState([{ loading: false, error: null }, { loading: false, error: null }])).toBe("ready");
  });

  it("retries all registry sources even if one refresh rejects", async () => {
    const first = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    const second = vi.fn().mockResolvedValue(undefined);
    await expect(retryDashboardSources([{ refresh: first }, { refresh: second }])).resolves.toBeUndefined();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});
