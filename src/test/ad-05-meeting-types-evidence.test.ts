import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unverifiedMeetingTypesView } from "../app/pages/administration/meetingTypesEvidence";

describe("AD-05 authoritative meeting type configuration evidence", () => {
  it("does not present generated sample configuration as real records", () => {
    expect(unverifiedMeetingTypesView().rows).toEqual([]);
  });

  it("states that the versioned source and authorized persistence are unavailable", () => {
    const view = unverifiedMeetingTypesView();
    expect(view.description).toMatch(/authoritative, versioned meeting type registry is not connected/i);
    expect(view.description).toMatch(/No sample records or status counts/);
    expect(view.unavailableReason).toMatch(/Tenant-scoped reads, actor authorization, versioned writes and SQL readback are unavailable/);
    expect(view.unavailableReason).toMatch(/Creation and edits are disabled/);
  });

  it("returns a fresh empty projection each time", () => {
    const first = unverifiedMeetingTypesView();
    first.rows.push({ type_id: "FAKE" });
    expect(unverifiedMeetingTypesView().rows).toEqual([]);
  });

  it("keeps the existing page structure while wiring the unavailable source", () => {
    const source = readFileSync("src/app/pages/administration/MeetingConfigPages.tsx", "utf8");
    const section = source.split("export function MeetingTypesPage() {")[1]?.split("export function QuorumRulesPage() {")[0] ?? "";
    expect(section).toContain("const evidence = unverifiedMeetingTypesView()");
    expect(section).toContain("dataError: evidence.unavailableReason");
    expect(section).toContain("dataErrorTitle:");
    expect(section).toContain("dataErrorDescription: evidence.unavailableReason");
    expect(section).toContain("rows:      evidence.rows");
    expect(section).toContain('entryBtn:  "Create Meeting Type"');
    expect(section).toContain("MEETING_TYPE_DRAWER_COLS");
    expect(section).toContain("filters:      BASE_FILTERS");
    expect(section).not.toContain("meetingTypeRows");
    expect(section).not.toContain("kpis");
  });

  it("renders page-specific unavailable copy and disables creation on data errors", () => {
    const config = readFileSync("src/app/pages/modulePageUtils.ts", "utf8");
    const table = readFileSync("src/app/components/pages/GeneratedTablePage.tsx", "utf8");
    expect(config).toContain("dataErrorTitle?: string");
    expect(config).toContain("dataErrorDescription?: string");
    expect(table).toContain("cfg.dataErrorTitle ?? \"Meeting records could not be loaded\"");
    expect(table).toContain("cfg.dataErrorDescription ?? \"The register cannot show reliable results until Supabase records are available.\"");
    expect(table).toContain("disabled={Boolean(cfg.dataLoading || cfg.dataError)}");
  });
});
