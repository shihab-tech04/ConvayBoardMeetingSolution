import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedNumberingConfigurationView } from "../app/pages/administration/numberingConfigurationEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/MeetingConfigPages.tsx"),
  "utf8",
);
const statusPage = pageSource
  .split("export function StatusesNumberingPage() {")[1] ?? "";

describe("AD-09 numbering configuration evidence state", () => {
  it("does not present sample prefixes, sequences, formats, or counters", () => {
    const evidence = unverifiedNumberingConfigurationView();

    expect(evidence.rows).toEqual([]);
    expect(evidence.description).toContain("No sample prefixes");
    expect(evidence.description).toContain("next-sequence values");
    expect(pageSource).not.toContain("gen(24");
    expect(statusPage).toContain("rows:      evidence.rows");
  });

  it("states that concurrency-safe uniqueness and no-reuse are unverified", () => {
    const evidence = unverifiedNumberingConfigurationView();

    expect(evidence.unavailableReason).toContain("atomically under concurrent meeting creates");
    expect(evidence.unavailableReason).toContain("never reuses a sequence");
    expect(evidence.unavailableReason).toContain("Tenant-authorized, versioned writes");
    expect(evidence.unavailableReason).toContain("stable-ID retry");
    expect(evidence.unavailableReason).toContain("durable readback, and audit");
    expect(evidence.unavailableReason).toContain("disabled");
  });

  it("combines the AD-08 and AD-09 guards without changing the approved page structure", () => {
    expect(statusPage).toContain('title: "Statuses & Numbering"');
    expect(statusPage).toContain('fc("prefix",       "Number Prefix")');
    expect(statusPage).toContain('fc("format",       "Number Format")');
    expect(statusPage).toContain("mobileCardMapping:");
    expect(statusPage).toContain("filters:      BASE_FILTERS");
    expect(statusPage).toContain("actions:      ROW_VIEW");
    expect(statusPage).toContain('drawerTitle:  "Status & Numbering Config"');
    expect(statusPage).toContain("drawerCols:   STATUS_NUMBERING_DRAWER_COLS");
    expect(statusPage).toContain('entryBtn:  "Add Status Config"');
    expect(statusPage).toContain("desc:  `${evidence.description} ${numbering.description}`");
    expect(statusPage).toContain("dataError: unavailableReason");
    expect(statusPage).toContain('dataErrorTitle: "Status and numbering configuration are unavailable"');
    expect(statusPage).toContain("dataErrorDescription: unavailableReason");
  });

  it("preserves the shared fail-closed write disablement", () => {
    const tableSource = readFileSync(
      resolve(process.cwd(), "src/app/components/pages/GeneratedTablePage.tsx"),
      "utf8",
    );

    expect(tableSource).toContain("disabled={Boolean(cfg.dataLoading || cfg.dataError)}");
  });
});
