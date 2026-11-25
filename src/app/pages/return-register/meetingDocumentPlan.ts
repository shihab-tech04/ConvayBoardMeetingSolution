/** One document/agenda projection for review and schedule payloads. Do not
 * substitute a guessed version when a selected document or pinned version is missing. */
import type { AgendaSubmission, AgendaDocumentLink, BoardDocument, DocumentVersion } from "../../data/boardMeetingData";
import type { DraftAgendaEntry, DraftDocumentEntry, DraftRosterEntry } from "./draftRelationshipPayload";

type Agenda = Pick<AgendaSubmission,"id"|"agenda_id"|"agenda_title"|"parent_agenda_id"|"archived_at">;
type Link = Pick<AgendaDocumentLink,"id"|"agenda_id"|"document_id"|"document_version_id"|"display_order">;
type Doc = Pick<BoardDocument,"id"|"doc_id"|"doc_name"|"related_agenda"|"version"|"current_version_id"|"confidentiality">;
type Version = Pick<DocumentVersion,"id"|"version_id"|"document_id"|"version_number">;
export interface PlannedMeetingDocument {
  document_id: string; document_name: string; version: string; document_version_id?: string;
  source: "agenda"|"additional"; source_agenda_id?: string; display_order: number; confidentiality: string;
}
export function buildMeetingDocumentPlan(
  selected: readonly DraftAgendaEntry[], additional: readonly DraftDocumentEntry[],
  agendas: readonly Agenda[], links: readonly Link[], documents: readonly Doc[], versions: readonly Version[] = [],
  participants: readonly Pick<DraftRosterEntry,"participant_type">[] = [],
) {
  const errors: string[] = [];
  const orderedAgendas: Array<{id:string;title:string;depth:number}> = [];
  const aliases = new Map<string,string>();
  const visited = new Set<string>();
  const visit = (agenda: Agenda, depth: number) => {
    const id = agenda.agenda_id || agenda.id;
    if (visited.has(id)) return;
    visited.add(id);
    if (!agenda.archived_at) {
      orderedAgendas.push({id,title:agenda.agenda_title || id,depth});
      aliases.set(agenda.id,id); aliases.set(id,id);
    }
    for (const child of agendas.filter(a=>a.parent_agenda_id===id || a.parent_agenda_id===agenda.id)) visit(child,depth+1);
  };
  for (const item of [...selected].sort((a,b)=>a.display_order-b.display_order)) {
    const matches=agendas.filter(a=>a.id===item.agenda_id || a.agenda_id===item.agenda_id);
    if (matches.length!==1) errors.push("Selected agenda is unavailable or ambiguous: "+item.agenda_id);
    else visit(matches[0],0);
  }
  const planned = new Map<string,PlannedMeetingDocument>();
  const add = (id:string, source:"agenda"|"additional", sourceAgenda?:string, pinnedId?:string, chosenVersion?:string) => {
    const matches=documents.filter(doc=>doc.id===id || doc.doc_id===id);
    if (matches.length!==1) { errors.push("Selected document is unavailable or ambiguous: "+id); return; }
    const doc=matches[0], canonicalId=doc.doc_id || doc.id;
    const ownVersions=versions.filter(v=>v.document_id===doc.id || v.document_id===canonicalId);
    let version=chosenVersion || doc.version;
    let versionId:string|undefined;
    if (pinnedId) {
      const pinned=ownVersions.filter(v=>v.id===pinnedId || v.version_id===pinnedId);
      if (pinned.length!==1 || !pinned[0].version_number) {
        errors.push("Pinned document version is unavailable: "+canonicalId);return;
      }
      version=pinned[0].version_number; versionId=pinned[0].version_id || pinned[0].id;
    } else if (chosenVersion && chosenVersion!==doc.version) {
      const historical=ownVersions.filter(v=>v.version_number===chosenVersion);
      if (historical.length!==1) { errors.push("Selected document version is unavailable or ambiguous: "+canonicalId+" v"+chosenVersion);return; }
      versionId=historical[0].version_id || historical[0].id;
    } else if (doc.current_version_id) {
      const current=ownVersions.filter(v=>(v.id===doc.current_version_id || v.version_id===doc.current_version_id) && v.version_number===version);
      if (current.length===1) versionId=current[0].version_id || current[0].id;
    }
    if (typeof version!=="string" || !version.trim()) {errors.push("Document version is unavailable: "+canonicalId);return;}
    const previous=planned.get(canonicalId);
    if (previous) {
      if (previous.version!==version || (previous.document_version_id && versionId && previous.document_version_id!==versionId))
        errors.push("Conflicting selected document versions: "+canonicalId);
      else if (!previous.document_version_id && versionId) previous.document_version_id=versionId;
      return;
    }
    planned.set(canonicalId,{document_id:canonicalId,document_name:doc.doc_name || canonicalId,version,
      ...(versionId?{document_version_id:versionId}:{}),source,...(sourceAgenda?{source_agenda_id:sourceAgenda}:{}),
      display_order:planned.size+1,confidentiality:doc.confidentiality});
  };
  // Explicit links win over a legacy related_agenda alias. Never replace an
  // explicit pinned version with the document's current version.
  for (const a of orderedAgendas) {
    const explicit = links.filter(l=>aliases.get(l.agenda_id)===a.id)
      .sort((x,y)=>(x.display_order??0)-(y.display_order??0)||x.id.localeCompare(y.id));
    for (const l of explicit) add(l.document_id,"agenda",a.id,l.document_version_id);
  }
  for (const doc of documents) {
    const agendaId=aliases.get(doc.related_agenda);
    if (agendaId && !planned.has(doc.doc_id||doc.id)) add(doc.doc_id||doc.id,"agenda",agendaId);
  }
  for (const entry of additional) add(entry.doc_id,"additional",undefined,undefined,entry.version);
  const result=[...planned.values()];
  // Preserve the existing review's role-based confidentiality check; this is
  // not proof that SQL document grants exist for every participant.
  const accessConflicts=result.filter(d=>d.confidentiality==="Strictly Confidential").length
    * participants.filter(p=>["Observer","Invitee","Presenter"].includes(p.participant_type)).length;
  return {agendas:orderedAgendas,documents:result,errors:[...new Set(errors)],accessConflicts};
}
