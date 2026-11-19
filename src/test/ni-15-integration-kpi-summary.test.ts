import { describe, expect, it } from "vitest";
import { summarizeIntegrationConnectionRead } from "../app/pages/administration/integrationKpiSummary";

describe("NI-15 verified integration KPI projection", () => {
  it("counts all four canonical statuses from a completed read", () => {
    const result = summarizeIntegrationConnectionRead({ state: "ready", records: [
      { id: "a", status: "Connected" },
      { id: "b", status: "Connected" },
      { id: "c", status: "Error" },
      { id: "d", status: "Pending Setup" },
      { id: "e", status: "Disconnected" },
    ] });
    expect(result).toEqual({ state: "ready", counts: {
      total: 5, connected: 2, errors: 1, pendingSetup: 1, disconnected: 1,
    } });
  });

  it("allows a genuine empty, successfully loaded registry", () => {
    expect(summarizeIntegrationConnectionRead({ state: "ready", records: [] })).toEqual({
      state: "ready", counts: { total: 0, connected: 0, errors: 0, pendingSetup: 0, disconnected: 0 },
    });
  });

  it("never renders zero/connected KPIs from an in-flight read", () => {
    expect(summarizeIntegrationConnectionRead({ state: "loading" })).toEqual({ state: "loading" });
  });

  it("never renders zero/connected KPIs after a failed provider read", () => {
    expect(summarizeIntegrationConnectionRead({ state: "error", error: "RLS denied" })).toEqual({ state: "error" });
  });

  it("rejects duplicate integration identifiers instead of double counting", () => {
    expect(summarizeIntegrationConnectionRead({ state: "ready", records: [
      { id: "a", status: "Connected" }, { id: "a", status: "Error" },
    ] })).toEqual({ state: "error" });
  });

  it("rejects unsupported state values rather than guessing a status", () => {
    expect(summarizeIntegrationConnectionRead({ state: "ready", records: [
      { id: "a", status: "Live" as never },
    ] })).toEqual({ state: "error" });
  });

  it("rejects empty identifiers and malformed provider rows", () => {
    expect(summarizeIntegrationConnectionRead({ state: "ready", records: [
      { id: "  ", status: "Connected" },
    ] })).toEqual({ state: "error" });
    expect(summarizeIntegrationConnectionRead({ state: "ready", records: null as never }))
      .toEqual({ state: "error" });
  });

  it("does not modify the canonical registry supplied by the caller", () => {
    const rows = Object.freeze([
      Object.freeze({ id: "a", status: "Connected" as const }),
      Object.freeze({ id: "b", status: "Disconnected" as const }),
    ]);
    const before = JSON.stringify(rows);
    const result = summarizeIntegrationConnectionRead({ state: "ready", records: rows });
    expect(result.state).toBe("ready");
    expect(JSON.stringify(rows)).toBe(before);
  });
});
