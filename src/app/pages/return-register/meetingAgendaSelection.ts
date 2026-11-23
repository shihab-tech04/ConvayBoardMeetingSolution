/** MT-04: a meeting has zero or more agendas. Selected agendas must remain valid.
 * Reuse this contract in Step 3, Review and the authoritative save handler.
 */
import type { AgendaSubmission } from "../../data/boardMeetingData";
import type { SelectedAgendaEntry } from "../../components/forms/AgendaDocumentStep";

export function parseOptionalMeetingAgendas(raw: unknown): SelectedAgendaEntry[] | null {
  try {
    const entries: unknown = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(entries) || !entries.every(entry =>
      entry && typeof entry === "object" &&
      typeof entry.agenda_id === "string" && entry.agenda_id.trim().length > 0 &&
      Number.isInteger(entry.display_order) && entry.display_order > 0
    )) return null;
    return entries as SelectedAgendaEntry[];
  } catch {
    return null;
  }
}

/** Empty selection is valid; a stale, draft, archived or non-ready selection isn't. */
export function validateOptionalMeetingAgendas(
  selected: readonly SelectedAgendaEntry[] | null,
  allAgendas: readonly AgendaSubmission[],
): string[] {
  if (selected === null) return ["Agenda selection is invalid. Reopen the Agendas step."];
  if (selected.length === 0) return [];

  const errors: string[] = [];
  const seen = new Set<string>();
  for (const entry of selected) {
    const id = entry.agenda_id;
    if (seen.has(id)) {
      errors.push("The same agenda is selected more than once. Remove the duplicate.");
      continue;
    }
    seen.add(id);
    const agenda = allAgendas.find(a => (a.agenda_id ?? a.id) === id);
    if (!agenda || agenda.archived_at || agenda.parent_agenda_id != null) {
      errors.push("A selected agenda is missing, archived or not a parent agenda. Remove it to continue without an agenda.");
    } else if (agenda.approval_status !== "Approved" ||
      (agenda as { meeting_readiness?: string }).meeting_readiness !== "Meeting Ready") {
      errors.push(`Agenda "${agenda.agenda_title || id}" must be Approved and Meeting Ready, or removed to continue without an agenda.`);
    }
  }
  return errors;
}
