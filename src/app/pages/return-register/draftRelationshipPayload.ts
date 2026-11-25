/** Strict draft relationship input boundary. A corrupt persisted selection is
 * not equivalent to an empty selection and must never trigger link deletion. */
export type SelectionSource = { type: string; source_id: string; source_label: string };
export type DraftRosterEntry = {
  id: string; user_id: string; user_name: string; user_designation: string; org_path: string;
  member_category: "quorum" | "general";
  participant_type: "Chairperson" | "Meeting Secretary" | "Member" | "Presenter" | "Invitee" | "Observer" | "Organizer";
  is_required: boolean; attendance_requirement?: "Mandatory" | "Optional" | "By Invitation";
  voting_eligible: boolean; quorum_eligible: boolean; selection_sources: SelectionSource[];
};
export type DraftAgendaEntry = { agenda_id: string; display_order: number };
export type DraftDocumentEntry = { doc_id: string; version: string; source_label: string };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const identity = (value: unknown): value is string => text(value) && value.length > 0 && value.trim() === value;
const roles = new Set(["Chairperson", "Meeting Secretary", "Member", "Presenter", "Invitee", "Observer", "Organizer"]);
const invalid = (section: string): never => { throw new Error(`Saved ${section} selection is invalid. Reopen that step and retry; no links were changed.`); };
function array(raw: unknown, section: string, newDraft: boolean): unknown[] {
  if (newDraft && (raw === undefined || raw === null || raw === "")) return [];
  if (!text(raw) || !raw) return invalid(section);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return invalid(section); }
  if (!Array.isArray(parsed)) return invalid(section);
  return parsed;
}
function attendance(row: DraftRosterEntry): NonNullable<DraftRosterEntry["attendance_requirement"]> {
  return row.attendance_requirement ?? (row.is_required ? "Mandatory" : "Optional");
}
function sources(values: unknown): SelectionSource[] {
  if (!Array.isArray(values)) return invalid("participant provenance");
  const unique = new Map<string, SelectionSource>();
  for (const value of values) {
    if (!object(value) || !identity(value.type) || !identity(value.source_id) || !text(value.source_label)) return invalid("participant provenance");
    const key = JSON.stringify([value.type, value.source_id]);
    const previous = unique.get(key);
    if (!previous || (!previous.source_label && value.source_label)) unique.set(key, {type:value.type,source_id:value.source_id,source_label:value.source_label});
  }
  return [...unique.values()];
}
export function normalizeDraftRelationships(values: Record<string, unknown>, newDraft = false): {
  participants: DraftRosterEntry[]; agendas: DraftAgendaEntry[]; documents: DraftDocumentEntry[];
} {
  const byUser = new Map<string,DraftRosterEntry>();
  for (const row of array(values.participant_links_json,"participant",newDraft)) {
    if (!object(row) || !identity(row.id) || !identity(row.user_id) || !text(row.user_name) || !text(row.user_designation) || !text(row.org_path)
      || !["quorum","general"].includes(String(row.member_category)) || !roles.has(String(row.participant_type))
      || typeof row.is_required !== "boolean" || typeof row.voting_eligible !== "boolean" || typeof row.quorum_eligible !== "boolean") return invalid("participant");
    if (row.attendance_requirement !== undefined && (!['Mandatory','Optional','By Invitation'].includes(String(row.attendance_requirement))
      || (row.attendance_requirement === 'Mandatory') !== row.is_required)) return invalid("participant attendance");
    const entry = {...row,selection_sources:sources(row.selection_sources)} as DraftRosterEntry;
    entry.attendance_requirement = attendance(entry);
    const previous = byUser.get(entry.user_id);
    if (!previous) { byUser.set(entry.user_id,entry); continue; }
    if (previous.participant_type !== entry.participant_type || previous.member_category !== entry.member_category
      || previous.is_required !== entry.is_required || previous.voting_eligible !== entry.voting_eligible || previous.quorum_eligible !== entry.quorum_eligible
      || attendance(previous) !== attendance(entry)) throw new Error("Conflicting participant roles or eligibility. Resolve the duplicate before saving; no links were changed.");
    previous.selection_sources = sources([...previous.selection_sources,...entry.selection_sources]);
  }
  const byAgenda = new Map<string,DraftAgendaEntry>();
  for (const row of array(values.selected_agenda_ids_json,"agenda",newDraft)) {
    if (!object(row) || !identity(row.agenda_id) || !Number.isSafeInteger(row.display_order) || Number(row.display_order)<1) return invalid("agenda");
    const previous=byAgenda.get(row.agenda_id);
    if (previous && previous.display_order!==row.display_order) return invalid("agenda ordering");
    byAgenda.set(row.agenda_id,{agenda_id:row.agenda_id,display_order:Number(row.display_order)});
  }
  const agendas=[...byAgenda.values()].sort((a,b)=>a.display_order-b.display_order);
  if (new Set(agendas.map(row=>row.display_order)).size!==agendas.length) return invalid("agenda ordering");
  const byDocument=new Map<string,DraftDocumentEntry>();
  for (const row of array(values.additional_doc_ids_json,"document",newDraft)) {
    if (!object(row)||!identity(row.doc_id)||!identity(row.version)||!text(row.source_label)) return invalid("document");
    const previous=byDocument.get(row.doc_id);
    if (previous && previous.version!==row.version) return invalid("document version");
    if (!previous) byDocument.set(row.doc_id,{doc_id:row.doc_id,version:row.version,source_label:row.source_label});
  }
  return {participants:[...byUser.values()],agendas,documents:[...byDocument.values()]};
}
