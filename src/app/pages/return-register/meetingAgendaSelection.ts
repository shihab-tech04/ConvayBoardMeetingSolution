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

/** Mirrors the SQL recursive meeting-link guard: even a third-level agenda
 * must be approved if it has no archived_at. Traverse archived ancestors as
 * SQL does, while ignoring repeated records/cycles defensively. Accept both
 * canonical record ID and agenda_id references from older persisted drafts. */
export function hasUnapprovedActiveAgendaDescendant(
  agenda: AgendaSubmission,
  allAgendas: readonly AgendaSubmission[],
): boolean {
  const byParent = new Map<string, AgendaSubmission[]>();
  for (const item of allAgendas) {
    if (!item.parent_agenda_id) continue;
    const children = byParent.get(item.parent_agenda_id) ?? [];
    children.push(item);
    byParent.set(item.parent_agenda_id, children);
  }
  const visited = new Set<string>();
  const pending: string[] = [agenda.id, agenda.agenda_id].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  while (pending.length) {
    const parentId = pending.shift()!;
    for (const child of byParent.get(parentId) ?? []) {
      const childId = child.id || child.agenda_id;
      if (!childId || visited.has(childId) || childId === agenda.id) continue;
      visited.add(childId);
      if (!child.archived_at && child.approval_status !== "Approved") return true;
      if (child.id) pending.push(child.id);
      if (child.agenda_id && child.agenda_id !== child.id) pending.push(child.agenda_id);
    }
  }
  return false;
}

/** Shared by picker, review, and save. The SQL meeting-link guard checks
 * every child and grandchild; a direct-child-only UI check is insufficient.
 * Approved legacy records without a readiness field remain permitted only
 * if all active descendants are approved. Explicit non-ready still blocks. */
export function isAgendaMeetingReady(
  agenda: AgendaSubmission,
  allAgendas: readonly AgendaSubmission[],
): boolean {
  if (agenda.archived_at || agenda.parent_agenda_id != null || agenda.approval_status !== "Approved") return false;
  const readiness = (agenda as { meeting_readiness?: string }).meeting_readiness;
  if (readiness && readiness !== "Meeting Ready") return false;
  return !hasUnapprovedActiveAgendaDescendant(agenda, allAgendas);
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
    } else if (!isAgendaMeetingReady(agenda, allAgendas)) {
      errors.push(`Agenda "${agenda.agenda_title || id}" must be Approved and Meeting Ready, or removed to continue without an agenda.`);
    }
  }
  return errors;
}
