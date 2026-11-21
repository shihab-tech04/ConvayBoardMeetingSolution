import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedMeetingAgendaTemplatesView } from "../app/pages/administration/meetingAgendaTemplatesEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/TemplatePages.tsx"),
  "utf8",
);
const agendaPage = pageSource.split("export function MeetingAgendaTemplatesPage() {")[1]?.split("export function MinutesResolutionTemplatesPage()")[0] ?? "";

describe("AD-10 meeting and agenda template evidence state", () => {
  it("does not present generated templates or derived counts as live data", () => {
    const evidence = unverifiedMeetingAgendaTemplatesView();

    expect(evidence.rows).toEqual([]);
    expect(evidence.unavailableReason).toContain("No sample templates or counts are shown");
    expect(pageSource).not.toContain("AGENDA_TEMPLATE_NAMES");
    expect(pageSource).not.toContain("agendaTemplateRows");
    expect(agendaPage).not.toMatch(/Total Templates|value: String/);
  });

  it("names the unverified version, authorization, isolation, and recovery guarantees", () => {
    const { unavailableReason } = unverifiedMeetingAgendaTemplatesView();

    expect(unavailableReason).toContain("tenant-scoped");
    expect(unavailableReason).toContain("Template version snapshots");
    expect(unavailableReason).toContain("authorization");
    expect(unavailableReason).toContain("draft instantiation");
    expect(unavailableReason).toContain("existing agendas");
    expect(unavailableReason).toContain("save retry/readback/audit");
    expect(unavailableReason).toContain("creation and edits are disabled");
  });

  it("preserves the approved agenda-template page structure and route actions", () => {
    expect(agendaPage).toContain('title: "Meeting & Agenda Templates"');
    expect(agendaPage).toContain('fc("template_id",   "Template ID")');
    expect(agendaPage).toContain('fc("template_name", "Template Name")');
    expect(agendaPage).toContain("mobileCardMapping:");
    expect(agendaPage).toContain("filters:      BASE_FILTERS");
    expect(agendaPage).toContain("actions:      ROW_VIEW");
    expect(agendaPage).toContain('drawerTitle:  "Agenda Template Details"');
    expect(agendaPage).toContain('entryBtn:  "Create Agenda Template"');
  });

  it("uses the shared unavailable state to hide false data and disable unsupported writes", () => {
    expect(agendaPage).toContain("rows:      evidence.rows");
    expect(agendaPage).toContain("dataError: evidence.unavailableReason");
    expect(agendaPage).toContain('dataErrorTitle: "Meeting and agenda templates are unavailable"');
    expect(agendaPage).toContain("dataErrorDescription: evidence.unavailableReason");

    const tableSource = readFileSync(
      resolve(process.cwd(), "src/app/components/pages/GeneratedTablePage.tsx"),
      "utf8",
    );
    expect(tableSource).toContain("disabled={Boolean(cfg.dataLoading || cfg.dataError)}");
  });

  it("leaves minutes, document, and communication template modules untouched", () => {
    expect(pageSource).toContain("const minutesTemplateRows: TableRow[] = gen(18");
    expect(pageSource).toContain("const docTemplateRows: TableRow[] = gen(22");
    expect(pageSource).toContain("const commTemplateRows: TableRow[] = gen(24");
  });
});
