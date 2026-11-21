import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedMinutesResolutionTemplatesView } from "../app/pages/administration/minutesResolutionTemplatesEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/TemplatePages.tsx"),
  "utf8",
);
const minutesPage = pageSource.split("export function MinutesResolutionTemplatesPage() {")[1]?.split("export function DocumentTemplatesPage()")[0] ?? "";

describe("AD-11 minutes and resolution template evidence state", () => {
  it("does not present generated minutes templates or derived counts as live data", () => {
    const evidence = unverifiedMinutesResolutionTemplatesView();

    expect(evidence.rows).toEqual([]);
    expect(evidence.unavailableReason).toContain("No sample templates or counts are shown");
    expect(pageSource).not.toContain("MINUTES_TEMPLATE_NAMES");
    expect(pageSource).not.toContain("minutesTemplateRows");
    expect(minutesPage).not.toMatch(/Total Templates|value: String/);
  });

  it("records the approved-version, isolation, denial, and recovery evidence still needed", () => {
    const { unavailableReason } = unverifiedMinutesResolutionTemplatesView();

    expect(unavailableReason).toContain("tenant-scoped");
    expect(unavailableReason).toContain("Approved-version document generation");
    expect(unavailableReason).toContain("new draft without changing its template");
    expect(unavailableReason).toContain("signed-snapshot immutability");
    expect(unavailableReason).toContain("wrong-tenant/unprivileged denial");
    expect(unavailableReason).toContain("save retry/reopen by stable ID");
    expect(unavailableReason).toContain("audit readback");
    expect(unavailableReason).toContain("template creation and edits are disabled");
  });

  it("preserves the approved minutes-template page fields and controls", () => {
    expect(minutesPage).toContain('title: "Minutes & Resolution Templates"');
    expect(minutesPage).toContain('fc("template_id",   "Template ID")');
    expect(minutesPage).toContain('fc("template_type", "Type")');
    expect(minutesPage).toContain("mobileCardMapping:");
    expect(minutesPage).toContain("filters:      BASE_FILTERS");
    expect(minutesPage).toContain("actions:      ROW_VIEW");
    expect(minutesPage).toContain('drawerTitle:  "Minutes Template Details"');
    expect(minutesPage).toContain('entryBtn:  "Create Minutes Template"');
  });

  it("uses the shared unavailable state to hide false data and disable unsupported writes", () => {
    expect(minutesPage).toContain("rows:      evidence.rows");
    expect(minutesPage).toContain("dataError: evidence.unavailableReason");
    expect(minutesPage).toContain('dataErrorTitle: "Minutes and resolution templates are unavailable"');
    expect(minutesPage).toContain("dataErrorDescription: evidence.unavailableReason");

    const tableSource = readFileSync(
      resolve(process.cwd(), "src/app/components/pages/GeneratedTablePage.tsx"),
      "utf8",
    );
    expect(tableSource).toContain("disabled={Boolean(cfg.dataLoading || cfg.dataError)}");
  });

  it("preserves the agenda and document guards while leaving communications unchanged", () => {
    expect(pageSource).toContain("unverifiedMeetingAgendaTemplatesView");
    expect(pageSource).toContain("unverifiedDocumentTemplatesView");
    expect(pageSource).not.toContain("docTemplateRows");
    expect(pageSource).toContain("const commTemplateRows: TableRow[] = gen(24");
  });
});
