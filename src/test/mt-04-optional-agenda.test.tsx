import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { AgendaSubmission } from "../app/data/boardMeetingData";
import { AgendaDocumentStep } from "../app/components/forms/AgendaDocumentStep";
import { parseOptionalMeetingAgendas, validateOptionalMeetingAgendas } from "../app/pages/return-register/meetingAgendaSelection";

const agenda = (id: string, status: string, readiness: string) => ({
  id, agenda_id: id, agenda_title: "Agenda " + id,
  approval_status: status, meeting_readiness: readiness,
}) as AgendaSubmission;

describe("MT-04 optional agendas in the five-step Create Meeting journey", () => {
  it("accepts zero agendas and a missing default JSON value", () => {
    expect(parseOptionalMeetingAgendas(undefined)).toEqual([]);
    expect(parseOptionalMeetingAgendas("[]")).toEqual([]);
    expect(validateOptionalMeetingAgendas([], [agenda("draft", "Draft", "")])).toEqual([]);
  });

  it("still rejects invalid JSON and unapproved, archived, missing or duplicate chosen agendas", () => {
    expect(parseOptionalMeetingAgendas("invalid")).toBeNull();
    expect(parseOptionalMeetingAgendas("{}")).toBeNull();
    expect(validateOptionalMeetingAgendas(null, [])).toContain("Agenda selection is invalid. Reopen the Agendas step.");
    const chosen = [{ agenda_id: "draft", display_order: 1 }];
    expect(validateOptionalMeetingAgendas(chosen, [agenda("draft", "Draft", "")])[0]).toMatch(/Approved and Meeting Ready/);
    expect(validateOptionalMeetingAgendas(chosen, [agenda("draft", "Approved", "In Review")])[0]).toMatch(/Approved and Meeting Ready/);
    expect(validateOptionalMeetingAgendas(chosen, [agenda("other", "Approved", "Meeting Ready")])[0]).toMatch(/missing/);
    const archived = { ...agenda("draft", "Approved", "Meeting Ready"), archived_at: "2026-11-23" };
    expect(validateOptionalMeetingAgendas(chosen, [archived])[0]).toMatch(/archived/);
    expect(validateOptionalMeetingAgendas([...chosen, { ...chosen[0], display_order: 2 }], [agenda("draft", "Approved", "Meeting Ready")])[0]).toMatch(/more than once/);
  });

  it("permits a valid explicitly chosen agenda", () => {
    expect(validateOptionalMeetingAgendas([{ agenda_id: "approved", display_order: 1 }], [
      agenda("approved", "Approved", "Meeting Ready"),
    ])).toEqual([]);
  });

  it("offers one-click removal of a stale selected Draft agenda without clearing additional documents", () => {
    const onValuesChange = vi.fn();
    render(<AgendaDocumentStep
      values={{ selected_agenda_ids_json: '[{"agenda_id":"draft","display_order":1}]',
        additional_doc_ids_json: '[{"doc_id":"doc-1","version":"1","source_label":"library"}]' }}
      onValuesChange={onValuesChange}
      allAgendas={[agenda("draft", "Draft", "")]}
      agendaDocLinks={[]}
      allDocuments={[]}
      existingMeetingAgendaLinks={[]}
      canManage
      onRequestDocumentComposer={vi.fn()}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Remove all selected agendas and continue without an agenda" }));
    expect(onValuesChange).toHaveBeenCalledWith(expect.objectContaining({
      selected_agenda_ids_json: "[]",
      additional_doc_ids_json: '[{"doc_id":"doc-1","version":"1","source_label":"library"}]',
    }));
    expect(screen.queryByText("Meeting Agenda")).toBeNull();
  });

  it("keeps empty agendas optional consistently at Step 3, Review and SQL-backed save", () => {
    const page = readFileSync("src/app/pages/return-register/OnlineReturnRegisterPage.tsx", "utf8");
    const review = readFileSync("src/app/components/forms/MeetingReviewPanel.tsx", "utf8");
    const selection = readFileSync("src/app/components/forms/AgendaDocumentStep.tsx", "utf8");
    expect(page).toContain("validateOptionalMeetingAgendas(selected, agendaRegistry.items)[0]");
    expect(page).toContain("validateOptionalMeetingAgendas(agendaEntriesParsed, agendaRegistry.items)");
    expect(page).not.toContain("At least one approved agenda must be selected");
    expect(review).toContain("validateOptionalMeetingAgendas(");
    expect(review).toContain("No agenda attached (optional)");
    expect(selection).toContain("Select Agendas (Optional)");
    expect(selection).toContain("Remove all — continue without agenda");
  });
});
