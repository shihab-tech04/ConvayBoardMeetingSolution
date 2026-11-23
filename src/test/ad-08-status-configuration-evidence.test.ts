import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedStatusConfigurationView } from "../app/pages/administration/statusConfigurationEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/MeetingConfigPages.tsx"),
  "utf8",
);
const statusPage = pageSource
  .split("export function StatusesNumberingPage() {")[1] ?? "";

describe("AD-08 status configuration evidence state", () => {
  it("does not present local sample states or counts as live configuration", () => {
    const evidence = unverifiedStatusConfigurationView();

    expect(evidence.rows).toEqual([]);
    expect(pageSource).not.toContain("gen(24");
    expect(pageSource).not.toContain("STATUS_NAMES");
    expect(pageSource).not.toContain("statusRows");
    expect(statusPage).not.toMatch(/Total Configs|Entity Types|value: String/);
  });

  it("explains the immutable-key and transition-rule protections", () => {
    const evidence = unverifiedStatusConfigurationView();

    expect(evidence.description).toContain("authoritative status configuration source");
    expect(evidence.description).toContain("No sample states");
    expect(evidence.unavailableReason).toContain("immutable machine-state keys");
    expect(evidence.unavailableReason).toContain("transition rules");
    expect(evidence.unavailableReason).toContain("tenant-authorized writes");
    expect(evidence.unavailableReason).toContain("disabled");
  });

  it("preserves the approved status and numbering page structure", () => {
    expect(statusPage).toContain('title: "Statuses & Numbering"');
    expect(statusPage).toContain('fc("status_name",  "Status Name")');
    expect(statusPage).toContain('fc("prefix",       "Number Prefix")');
    expect(statusPage).toContain("mobileCardMapping:");
    expect(statusPage).toContain("filters:      BASE_FILTERS");
    expect(statusPage).toContain("actions:      ROW_VIEW");
    expect(statusPage).toContain('drawerTitle:  "Status & Numbering Config"');
    expect(statusPage).toContain("drawerCols:   STATUS_NUMBERING_DRAWER_COLS");
    expect(statusPage).toContain('entryBtn:  "Add Status Config"');
  });

  it("configures an unavailable error so the shared page disables writes", () => {
    expect(statusPage).toContain("evidence.unavailableReason");
    expect(statusPage).toContain("dataError: unavailableReason");
    expect(statusPage).toContain("dataErrorTitle: \"Status and numbering configuration are unavailable\"");
    expect(statusPage).toContain("dataErrorDescription: unavailableReason");
    expect(statusPage).toContain("rows:      evidence.rows");
    const tableSource = readFileSync(
      resolve(process.cwd(), "src/app/components/pages/GeneratedTablePage.tsx"),
      "utf8",
    );
    expect(tableSource).toContain("disabled={Boolean(cfg.dataLoading || cfg.dataError)}");
  });
});
