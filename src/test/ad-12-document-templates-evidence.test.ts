import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedDocumentTemplatesView } from "../app/pages/administration/documentTemplatesEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/TemplatePages.tsx"),
  "utf8",
);
const documentPage = pageSource
  .split("export function DocumentTemplatesPage() {")[1]
  ?.split("export function CommunicationTemplatesPage()")[0] ?? "";

describe("AD-12 document template evidence state", () => {
  it("does not present generated document templates or derived counts as live data", () => {
    const evidence = unverifiedDocumentTemplatesView();

    expect(evidence.rows).toEqual([]);
    expect(evidence.unavailableReason).toContain("No sample templates or counts are shown");
    expect(pageSource).not.toContain("DOC_TEMPLATE_NAMES");
    expect(pageSource).not.toContain("docTemplateRows");
    expect(documentPage).not.toMatch(/Total Templates|value: String/);
  });

  it("records the versioning, eligible-use, restricted-content, denial, and recovery evidence still needed", () => {
    const { unavailableReason } = unverifiedDocumentTemplatesView();

    expect(unavailableReason).toContain("tenant-scoped");
    expect(unavailableReason).toContain("metadata/content revision tracking");
    expect(unavailableReason).toContain("eligible-user instantiation");
    expect(unavailableReason).toContain("denial of unrestricted content");
    expect(unavailableReason).toContain("wrong-tenant/unprivileged denial");
    expect(unavailableReason).toContain("save retry/reopen by stable ID");
    expect(unavailableReason).toContain("audit readback");
    expect(unavailableReason).toContain("template creation and edits are disabled");
  });

  it("preserves the approved document-template fields, filters, mobile mapping, and actions", () => {
    expect(documentPage).toContain('title: "Document Templates"');
    expect(documentPage).toContain('fc("template_id",   "Template ID")');
    expect(documentPage).toContain('fc("template_name", "Template Name")');
    expect(documentPage).toContain('fc("category",      "Category")');
    expect(documentPage).toContain('fc("file_format",   "Format")');
    expect(documentPage).toContain('fc("language",      "Language")');
    expect(documentPage).toContain('fc("version",       "Version")');
    expect(documentPage).toContain("mobileCardMapping:");
    expect(documentPage).toContain("filters:      BASE_FILTERS");
    expect(documentPage).toContain("actions:      ROW_VIEW");
    expect(documentPage).toContain('drawerTitle:  "Document Template Details"');
    expect(documentPage).toContain('{ id: "edit",');
    expect(documentPage).toContain('{ id: "preview",');
    expect(documentPage).toContain('{ id: "activate",');
    expect(documentPage).toContain('{ id: "duplicate",');
    expect(documentPage).toContain('{ id: "download",');
    expect(documentPage).toContain('{ id: "archive",');
    expect(documentPage).toContain('entryBtn:  "Create Document Template"');
  });

  it("uses the shared unavailable state to hide false data and disable unsupported writes", () => {
    expect(documentPage).toContain("rows:      evidence.rows");
    expect(documentPage).toContain("dataError: evidence.unavailableReason");
    expect(documentPage).toContain('dataErrorTitle: "Document templates are unavailable"');
    expect(documentPage).toContain("dataErrorDescription: evidence.unavailableReason");

    const tableSource = readFileSync(
      resolve(process.cwd(), "src/app/components/pages/GeneratedTablePage.tsx"),
      "utf8",
    );
    expect(tableSource).toContain("disabled={Boolean(cfg.dataLoading || cfg.dataError)}");
  });

  it("preserves the meeting, agenda, minutes, and communication modules", () => {
    expect(pageSource).toContain("unverifiedMeetingAgendaTemplatesView");
    expect(pageSource).toContain("unverifiedMinutesResolutionTemplatesView");
    expect(pageSource).toContain("const commTemplateRows: TableRow[] = gen(24");
  });
});
