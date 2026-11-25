// Read-only meeting-scoped material projection. A metadata reference is NOT
// proof of a successful download, a document grant, or an approved policy.
type Agenda = { id: string; agenda_id: string; parent_agenda_id?: string };
type AgendaLink = { meeting_id: string; agenda_id: string };
type MeetingDoc = { id: string; meeting_id: string; document_id: string; version: string; source: "agenda" | "additional"; source_agenda_id?: string; display_order: number };
type AgendaDoc = { id: string; agenda_id: string; document_id: string; document_version_id?: string };
type Document = { id: string; doc_id: string; doc_name: string; version: string; related_meeting: string; related_agenda: string; current_version_id?: string; original_file_ref?: string; content_body?: string };
type Version = { id: string; version_id: string; document_id: string; version_number: string; content_ref?: string; original_file_ref?: string };
export type ReadinessMaterial = { key: string; documentId: string; title: string; source: string; version: string; inSnapshot: boolean; status: "reference_present" | "missing_content" | "unavailable_document" | "unavailable_version" };
const nonempty = (s: string | undefined) => Boolean(s?.trim());
export function readDocumentReadiness(meetingId: string, agendas: readonly Agenda[], agendaLinks: readonly AgendaLink[], meetingDocs: readonly MeetingDoc[], agendaDocs: readonly AgendaDoc[], documents: readonly Document[], versions: readonly Version[]) {
  const agendaIds = new Set(agendaLinks.filter(l => l.meeting_id === meetingId).map(l => l.agenda_id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of agendas) {
      if (agendaIds.has(a.id) || agendaIds.has(a.agenda_id) || (a.parent_agenda_id && agendaIds.has(a.parent_agenda_id))) {
        for (const id of [a.id, a.agenda_id]) if (id && !agendaIds.has(id)) { agendaIds.add(id); changed = true; }
      }
    }
  }
  const result: ReadinessMaterial[] = [];
  const seen = new Set<string>();
  const snapshotDocs = new Set<string>();
  const uniqueDocument = (id: string) => {
    const matches = documents.filter(d => d.id === id || d.doc_id === id);
    return matches.length === 1 ? matches[0] : undefined;
  };
  const canonical = (id: string) => uniqueDocument(id)?.doc_id || id;
  const add = (id: string, source: string, inSnapshot: boolean, versionNumber?: string, versionId?: string) => {
    const doc = uniqueDocument(id);
    const docId = doc?.doc_id || id;
    const docVersions = doc ? versions.filter(v => v.document_id === doc.id || v.document_id === doc.doc_id) : [];
    // Resolve an explicitly pinned version before considering the current one.
    const target = versionId ? docVersions.filter(v => v.id === versionId || v.version_id === versionId)
      : versionNumber ? docVersions.filter(v => v.version_number === versionNumber)
      : doc?.current_version_id ? docVersions.filter(v => v.id === doc.current_version_id || v.version_id === doc.current_version_id) : [];
    const version = target.length === 1 ? target[0] : undefined;
    const label = version?.version_number || versionNumber || versionId || doc?.version || "Unspecified";
    const key = JSON.stringify([docId, label, inSnapshot]);
    if (seen.has(key)) return;
    seen.add(key);
    const current = Boolean(doc && (!versionNumber || doc.version === versionNumber) && (!versionId || doc.current_version_id === versionId || version?.version_id === doc.current_version_id || version?.id === doc.current_version_id));
    let status: ReadinessMaterial["status"];
    if (!doc) status = "unavailable_document";
    else if (target.length > 1 || (versionId && !version) || (versionNumber && !current && !version) || (!versionId && !versionNumber && doc.current_version_id && !version)) status = "unavailable_version";
    else if (nonempty(version?.content_ref) || nonempty(version?.original_file_ref) || (current && (nonempty(doc.original_file_ref) || nonempty(doc.content_body)))) status = "reference_present";
    else status = "missing_content";
    result.push({ key, documentId: docId, title: doc?.doc_name || id, source, version: label, inSnapshot, status });
  };
  for (const link of meetingDocs.filter(l => l.meeting_id === meetingId).sort((a,b) => a.display_order-b.display_order)) {
    snapshotDocs.add(canonical(link.document_id));
    add(link.document_id, link.source === "agenda" ? "Meeting agenda" : "Additional meeting document", true, link.version);
  }
  for (const link of agendaDocs.filter(l => agendaIds.has(l.agenda_id))) {
    if (!snapshotDocs.has(canonical(link.document_id))) add(link.document_id, "Agenda reference — not in saved meeting links", false, undefined, link.document_version_id);
  }
  // Legacy metadata is a reference only, not proof of an attached meeting document.
  for (const doc of documents.filter(d => d.related_meeting === meetingId || (d.related_agenda && agendaIds.has(d.related_agenda)))) {
    if (!result.some(m => m.documentId === doc.doc_id)) add(doc.doc_id, "Legacy reference — not in saved meeting links", false);
  }
  return result;
}
export function materialStatusLabel(status: ReadinessMaterial["status"]) {
  return {reference_present:"Content reference present — access unverified",missing_content:"No content reference",unavailable_document:"Document unavailable to this account",unavailable_version:"Selected version unavailable to this account"}[status];
}
