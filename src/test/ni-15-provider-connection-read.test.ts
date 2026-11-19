import { describe, expect, it } from "vitest";
import {
  normalizeProviderConnectionRead, MAX_CONNECTED_EVIDENCE_AGE_MS,
} from "../app/pages/administration/integrationConnectionRead";
import { summarizeIntegrationConnectionRead } from "../app/pages/administration/integrationKpiSummary";

const ids = ["smtp-email", "zoom", "sms-gateway"] as const;
const NOW = Date.parse("2026-11-08T12:00:00Z");
describe("NI-15 trusted provider read adapter", () => {
  it("no provider rows means all available catalogue entries pending setup", () => {
    const result = normalizeProviderConnectionRead(ids, [], NOW);
    expect(summarizeIntegrationConnectionRead(result)).toEqual({
      state: "ready", counts: { total: 3, connected: 0, errors: 0, pendingSetup: 3, disconnected: 0 },
    });
  });
  it("counts only a recent verified server-connected provider", () => {
    const result = normalizeProviderConnectionRead(ids, [
      { provider_id: "smtp-email", status: "Connected", verified_at: "2026-11-08T11:00:00Z" },
      { provider_id: "zoom", status: "Disconnected", verified_at: null },
    ], NOW);
    expect(summarizeIntegrationConnectionRead(result)).toEqual({
      state: "ready", counts: { total: 3, connected: 1, errors: 0, pendingSetup: 1, disconnected: 1 },
    });
  });
  it("treats stale connected evidence as error, not connected", () => {
    const result = normalizeProviderConnectionRead(ids, [
      { provider_id: "smtp-email", status: "Connected",
        verified_at: new Date(NOW - MAX_CONNECTED_EVIDENCE_AGE_MS - 1).toISOString() },
    ], NOW);
    expect(result.state).toBe("ready");
    expect(result.state === "ready" && result.records[0].status).toBe("Error");
  });
  it("fails closed for unverified, future-dated or malformed connected claims", () => {
    for (const verified_at of [null, "", "not-a-date", new Date(NOW+1).toISOString()]) {
      expect(normalizeProviderConnectionRead(ids, [
        { provider_id: "smtp-email", status: "Connected", verified_at },
      ], NOW).state).toBe("error");
    }
  });
  it("fails closed for missing IDs, unknown providers, duplicate rows", () => {
    for (const rows of [
      [{ provider_id: "not-in-catalogue", status: "Connected", verified_at: new Date(NOW).toISOString() }],
      [{ provider_id: "smtp-email", status: "Error", verified_at: null },
        { provider_id: "smtp-email", status: "Pending Setup", verified_at: null }],
      [{ status: "Error", verified_at: null }],
      [{ provider_id: "zoom", status: "Online", verified_at: null }],
    ]) {
      expect(normalizeProviderConnectionRead(ids, rows, NOW).state).toBe("error");
    }
  });
  it("fails closed for malformed snapshots and duplicate catalogue IDs", () => {
    expect(normalizeProviderConnectionRead(ids, null, NOW).state).toBe("error");
    expect(normalizeProviderConnectionRead(["smtp-email","smtp-email"], [], NOW).state).toBe("error");
    expect(normalizeProviderConnectionRead(ids, [], Number.NaN).state).toBe("error");
  });
  it("does not mutate provider rows or catalogue IDs", () => {
    const rows = Object.freeze([Object.freeze({
      provider_id: "zoom", status: "Error", verified_at: null,
    })]);
    const copy = JSON.stringify(rows);
    expect(normalizeProviderConnectionRead(ids, rows, NOW).state).toBe("ready");
    expect(JSON.stringify(rows)).toBe(copy);
  });
  it("preserves an Error status from a trusted provider read", () => {
    const result = normalizeProviderConnectionRead(ids, [
      { provider_id: "smtp-email", status: "Error", verified_at: null },
    ], NOW);
    expect(summarizeIntegrationConnectionRead(result)).toEqual({
      state: "ready", counts: { total: 3, connected: 0, errors: 1, pendingSetup: 2, disconnected: 0 },
    });
  });
});
