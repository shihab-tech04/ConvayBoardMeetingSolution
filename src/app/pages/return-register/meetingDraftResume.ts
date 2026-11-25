import { resolveMeetingDraftTarget } from "./meetingDraftTarget";
import { normalizeDraftRelationships } from "./draftRelationshipPayload";
import type { Meeting, MeetingParticipantLink, MeetingAgendaLink, MeetingDocumentLink } from "../../data/boardMeetingData";
import type { DraftParticipantLink } from "../../components/forms/ParticipantSelectorStep";
import type { AttendanceRequirement } from "./attendanceRequirement";
import type { TableRow } from "../modulePageUtils";

type StoredRow<T extends { id: string }> = { record_id: string; tenant_id: string | null; revision: number; payload: T };
type Request = (path: string, init?: RequestInit) => Promise<Response>;
type Child = { id: string; meeting_id: string };
const entityPath = "/rest/v1/convay_entity_records";
const pageSize = 200;

async function readRows<T extends {id:string}>(request: Request, entity: string, filters: Record<string,string>): Promise<StoredRow<T>[]> {
  const rows: StoredRow<T>[] = [];
  for (let offset = 0; offset < 100000; offset += pageSize) {
    const params = new URLSearchParams({ select: "record_id,tenant_id,revision,payload", entity_key: "eq." + entity,
      ...filters, order: "record_id.asc", limit: String(pageSize), offset: String(offset) });
    const response = await request(entityPath + "?" + params.toString(), { headers: { Prefer: "count=exact" } });
    if (!response.ok) throw new Error("Unable to read the saved draft. Retry.");
    const page: unknown = await response.json();
    if (!Array.isArray(page) || page.some(row => !row || typeof row.record_id !== "string"
        || !(row.tenant_id === null || typeof row.tenant_id === "string")
        || !Number.isSafeInteger(row.revision) || row.revision < 1
        || !row.payload || row.payload.id !== row.record_id)) throw new Error("Invalid saved draft readback.");
    rows.push(...page as StoredRow<T>[]);
    const range = response.headers.get("Content-Range");
    const count = range?.split("/")[1];
    if (count !== undefined && count !== "*" && Number(count) === rows.length) break;
    if (page.length < pageSize) {
      if (count !== undefined && count !== "*" && Number(count) !== rows.length) throw new Error("Draft readback changed. Retry.");
      break;
    }
    if (offset + pageSize >= 100000) throw new Error("Draft readback exceeded the safe record limit.");
  }
  if (new Set(rows.map(row => row.record_id)).size !== rows.length) throw new Error("Duplicate saved draft records. Retry.");
  return rows;
}

/** Only authenticated, RLS-filtered reads. Never resume with stale cached child links. */
export async function readMeetingDraftSnapshot(request: Request, recordId: string, meetingId: string,
  canContinue: (meeting: Meeting) => boolean) {
  if (!recordId || !meetingId) throw new Error("This draft has no stable meeting identity.");
  const readParent = () => readRows<Meeting>(request, "bms.meetings", { record_id: "eq." + recordId });
  const parents = await readParent();
  const target = resolveMeetingDraftTarget(recordId, parents.map(row => row.payload));
  if (!target || target.recordId !== recordId || target.meetingId !== meetingId || parents.length !== 1 || !canContinue(parents[0].payload)) {
    throw new Error("This draft is no longer available to continue.");
  }
  const parent = parents[0];
  const filters = { "payload->>meeting_id": "eq." + meetingId, tenant_id: parent.tenant_id === null ? "is.null" : "eq." + parent.tenant_id };
  const readChildren = async <T extends Child>(entity: string) => {
    const rows = await readRows<T>(request, entity, filters);
    if (rows.some(row => row.tenant_id !== parent.tenant_id || row.payload.meeting_id !== meetingId))
      throw new Error("Draft relationship scope did not match. Retry.");
    return rows.map(row => row.payload);
  };
  const [participants, agendas, documents] = await Promise.all([
    readChildren<MeetingParticipantLink>("bms.meetingParticipantLinks"),
    readChildren<MeetingAgendaLink>("bms.meetingAgendaLinks"),
    readChildren<MeetingDocumentLink>("bms.meetingDocumentLinks"),
  ]);
  // Draft saving updates the parent and relationships in one batch; a changed
  // parent revision means the independently read children may be inconsistent.
  const verified = await readParent();
  if (verified.length !== 1 || verified[0].record_id !== recordId || verified[0].tenant_id !== parent.tenant_id
      || verified[0].revision !== parent.revision || !canContinue(verified[0].payload)
      || !resolveMeetingDraftTarget(recordId, [verified[0].payload])) throw new Error("The draft changed during readback. Retry.");
  return { meeting: parent.payload, participants, agendas, documents, revision: parent.revision };
}

type DraftSnapshot = Awaited<ReturnType<typeof readMeetingDraftSnapshot>>;
type UserLabel = { id: string; name?: string; designation?: string; position?: string; circle?: string };
type DocumentLabel = { id: string; doc_id?: string; doc_name?: string };

export function restoreMeetingDraftRow(snapshot: DraftSnapshot, users: readonly UserLabel[], documents: readonly DocumentLabel[]): TableRow {
  const { meeting, participants, agendas, documents: links } = snapshot;
  const roster: DraftParticipantLink[] = participants.map(link => {
    const user = users.find(item => item.id === link.user_id);
    let sources: DraftParticipantLink["selection_sources"] = [];
    if (link.selection_sources_json) {
      const value: unknown = JSON.parse(link.selection_sources_json);
      if (!Array.isArray(value) || value.some(source => !source || typeof source.type !== "string" || typeof source.source_id !== "string" || typeof source.source_label !== "string"))
        throw new Error("Saved participant selection sources are invalid. Refresh and retry.");
      sources = value;
    }
    if (!sources.length && link.selection_source_type) sources.push({
      type: link.selection_source_type, source_id: link.selection_source_id ?? link.user_id, source_label: link.selection_source_type,
    });
    return {
      id: "restored-" + link.user_id + "-" + link.id,
      user_id: link.user_id, user_name: user?.name ?? link.user_id,
      user_designation: user?.designation ?? user?.position ?? "", org_path: user?.circle ?? "",
      member_category: link.member_category ?? "general",
      participant_type: link.participant_type as DraftParticipantLink["participant_type"],
      is_required: link.is_required, attendance_requirement: link.attendance_requirement as AttendanceRequirement | undefined,
      voting_eligible: link.voting_eligible, quorum_eligible: link.quorum_eligible, selection_sources: sources,
    };
  });
  const raw = {
    participant_links_json: JSON.stringify(roster),
    selected_agenda_ids_json: JSON.stringify([...agendas].sort((a,b) => a.display_order-b.display_order)
      .map(link => ({ agenda_id: link.agenda_id, display_order: link.display_order }))),
    additional_doc_ids_json: JSON.stringify(links.filter(link => link.source === "additional").sort((a,b) => a.display_order-b.display_order)
      .map(link => ({ doc_id: link.document_id, version: link.version, source_label: documents.find(doc => (doc.doc_id ?? doc.id) === link.document_id)?.doc_name ?? link.document_id }))),
  };
  const normalized = normalizeDraftRelationships(raw);
  return { ...meeting, draft_revision: String(snapshot.revision), participant_links_json: JSON.stringify(normalized.participants),
    selected_agenda_ids_json: JSON.stringify(normalized.agendas), additional_doc_ids_json: JSON.stringify(normalized.documents) };
}

/** Client stale-write preflight. The server must still enforce an atomic revision
 * comparison inside the mutation transaction; this check is not a SQL CAS. */
export function assertResumedDraftRevision(snapshot: Pick<DraftSnapshot,"revision">, saved: unknown): void {
  const revision = typeof saved === "number" ? saved
    : typeof saved === "string" && /^[1-9][0-9]*$/.test(saved) ? Number(saved) : NaN;
  if (!Number.isSafeInteger(revision) || revision < 1 || snapshot.revision !== revision)
    throw new Error("The saved draft changed. Reopen it before saving; no links were changed.");
}

/** Compare the persisted canonical relationships, not local display names or synthetic UI IDs. */
export function assertDraftRelationshipReadback(snapshot: DraftSnapshot,
  expected: ReturnType<typeof normalizeDraftRelationships>, step: number): void {
  const actual = normalizeDraftRelationships(restoreMeetingDraftRow(snapshot, [], []));
  const participantKey = (p: typeof expected.participants[number]) => ({
    user_id:p.user_id,participant_type:p.participant_type,member_category:p.member_category,
    is_required:p.is_required,attendance_requirement:p.attendance_requirement,
    voting_eligible:p.voting_eligible,quorum_eligible:p.quorum_eligible,
    selection_sources:(p.selection_sources.length ? p.selection_sources : [{type:"individual",source_id:p.user_id,source_label:"individual"}])
      .map(s=>[s.type,s.source_id,s.source_label]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
  const canonical = (r: typeof expected) => ({
    participants:r.participants.map(participantKey).sort((a,b)=>a.user_id.localeCompare(b.user_id)),
    agendas:r.agendas,
    documents:r.documents.map(d=>({doc_id:d.doc_id,version:d.version})),
  });
  if (String(snapshot.meeting.draft_current_step ?? "") !== String(step) ||
      JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected)))
    throw new Error("The draft write was acknowledged but saved step or relationships did not match. Reopen the saved draft before editing.");
}
