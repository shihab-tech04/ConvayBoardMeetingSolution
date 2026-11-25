import { resolveMeetingDraftTarget } from "./meetingDraftTarget";
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
  return {
    ...meeting,
    participant_links_json: JSON.stringify(roster),
    selected_agenda_ids_json: JSON.stringify([...agendas].sort((a,b) => a.display_order-b.display_order)
      .map(link => ({ agenda_id: link.agenda_id, display_order: link.display_order }))),
    additional_doc_ids_json: JSON.stringify(links.filter(link => link.source === "additional").sort((a,b) => a.display_order-b.display_order)
      .map(link => ({ doc_id: link.document_id, version: link.version, source_label: documents.find(doc => (doc.doc_id ?? doc.id) === link.document_id)?.doc_name ?? link.document_id }))),
  };
}
