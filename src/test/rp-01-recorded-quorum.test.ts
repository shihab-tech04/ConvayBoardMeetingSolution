import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { latestRecordedQuorumStatus, type RecordedQuorumEvidence } from "../app/pages/archive-reports/recordedQuorumStatus";

const evidence = (meeting_id: string, quorum_met: string, recorded_at: string): RecordedQuorumEvidence =>
  ({ meeting_id, quorum_met, recorded_at });

describe("RP-01 — historical quorum must be recorded, not forecast", () => {
  it("reads the latest confirmed quorum event for this meeting only", () => {
    const records = [
      evidence("MTG-1", "No", "2026-11-20T09:00:00Z"),
      evidence("MTG-2", "Yes", "2026-11-20T15:00:00Z"),
      evidence("MTG-1", "Yes", "2026-11-20T10:00:00Z"),
    ];
    expect(latestRecordedQuorumStatus("MTG-1", records)).toBe("Met");
    expect(latestRecordedQuorumStatus("MTG-2", records)).toBe("Met");
    expect(latestRecordedQuorumStatus("MTG-3", records)).toBe("Unverified");
  });
  it("reports a newer failure without inflating the met quorum count", () => {
    expect(latestRecordedQuorumStatus("MTG-1", [
      evidence("MTG-1", "Yes", "2026-11-20T09:00:00Z"),
      evidence("MTG-1", "No", "2026-11-20T10:00:00Z"),
    ])).toBe("Not Met");
  });
  it("fails closed on malformed or absent quorum evidence", () => {
    expect(latestRecordedQuorumStatus("", [evidence("MTG-1", "Yes", "2026-11-20T09:00:00Z")])).toBe("Unverified");
    expect(latestRecordedQuorumStatus("MTG-1", [])).toBe("Unverified");
    expect(latestRecordedQuorumStatus("MTG-1", [evidence("MTG-1", "Pending", "2026-11-20T09:00:00Z")])).toBe("Unverified");
    expect(latestRecordedQuorumStatus("MTG-1", [
      evidence("MTG-1", "Yes", "invalid"),
      evidence("MTG-1", "No", "2026-11-20T10:00:00Z"),
    ])).toBe("Unverified");
  });
  it("does not guess when latest same-time reports disagree", () => {
    expect(latestRecordedQuorumStatus("MTG-1", [
      evidence("MTG-1", "Yes", "2026-11-20T09:00:00Z"),
      evidence("MTG-1", "No", "2026-11-20T09:00:00Z"),
    ])).toBe("Unverified");
  });
  it("supports a single authenticated legacy event with time-only provenance", () => {
    expect(latestRecordedQuorumStatus("MTG-1", [evidence("MTG-1", "Yes", "09:05")])).toBe("Met");
    expect(latestRecordedQuorumStatus("MTG-1", [evidence("MTG-1", "No", "09:05")])).toBe("Not Met");
  });
  it("binds the report to real registry events and hides false KPIs on errors", () => {
    const source = readFileSync("src/app/pages/archive-reports/AnalyticsPages.tsx", "utf8");
    const block = source.slice(source.indexOf("export function MeetingPerformanceAnalyticsPage()"),
      source.indexOf("// ─── Participation Analytics"));
    expect(block).toContain("useQuorumEventRegistry()");
    expect(block).toContain("latestRecordedQuorumStatus(m.meeting_id, quorumReg.items)");
    expect(block).toContain('rows.filter(r => r.quorum_observed === "Met")');
    expect(block).toContain('fc("quorum_observed",');
    expect(block).toContain("dataLoading: Boolean(registry.loading || quorumReg.loading)");
    expect(block).toContain("dataError: registry.error ?? quorumReg.error ?? null");
    expect(block).not.toContain('rows.filter(r => r.quorum_forecast === "Met"');
  });
});
