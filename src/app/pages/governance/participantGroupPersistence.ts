/**
 * GV-13 — preserve the existing participant-group form while requiring
 * registry SQL acknowledgement and independent authoritative readback.
 * Server ownership: permission, tenant isolation, active eligible members,
 * roster deduplication and audit remain separate WS0/WS-F acceptance gates.
 */
import type { ParticipantGroup } from "../../data/boardMeetingData";

export interface ParticipantGroupGateway {
  list: () => Promise<ParticipantGroup[]>;
  create: (record: ParticipantGroup) => Promise<boolean>;
  update: (id: string, patch: Partial<ParticipantGroup>) => Promise<boolean>;
}
export type ParticipantGroupValues = Record<string, unknown>;
const EDIT_FIELDS = [
  "group_name", "group_type", "governance_body", "membership_rule",
  "quorum_rule", "description", "status", "meeting_role", "voting_eligible",
] as const;
const GROUP_TYPES = new Set([
  "Static", "Dynamic", "Role-Based", "Voting Members", "Non-Voting Observers",
  "Invitees", "Non-Voting Support", "Independent Members",
]);
const GROUP_STATUS = new Set(["Active", "Inactive"]);
const stringKey = (text: string): string =>
  text.normalize("NFKC").trim().toLowerCase();
function normalize(values: ParticipantGroupValues): Partial<ParticipantGroup> {
  const patch: Record<string, string | boolean> = {};
  for (const key of EDIT_FIELDS) {
    const raw = values[key];
    if (raw === undefined || raw === null) continue;
    if (key === "voting_eligible") {
      if (raw !== true && raw !== false && raw !== "true" && raw !== "false") {
        throw new Error("Voting eligibility must be a true or false value.");
      }
      patch[key] = raw === true || raw === "true";
    } else {
      if (typeof raw !== "string" && typeof raw !== "number") {
        throw new Error("Participant group fields must be text or numbers.");
      }
      patch[key] = String(raw).trim();
    }
  }
  if (patch.group_name !== undefined && patch.group_name === "")
    throw new Error("A participant group name is required.");
  if (patch.group_type !== undefined && !GROUP_TYPES.has(String(patch.group_type)))
    throw new Error("A valid participant group type is required.");
  if (patch.status !== undefined && !GROUP_STATUS.has(String(patch.status)))
    throw new Error("A supported participant group status is required.");
  return patch as Partial<ParticipantGroup>;
}
function verifyReadback(row: ParticipantGroup | undefined, values: Partial<ParticipantGroup>) {
  if (!row || Object.entries(values).some(([key,expected]) =>
    row[key] !== expected)) {
    throw new Error("Participant group SQL readback is missing or inconsistent. Refresh before retrying.");
  }
}
export async function createParticipantGroup(
  values: ParticipantGroupValues,
  identity: { id: string; created_at: string },
  gateway: ParticipantGroupGateway,
): Promise<ParticipantGroup> {
  const patch = normalize(values);
  if (!identity.id?.trim() || !identity.created_at?.trim() ||
      !patch.group_name?.trim() || !patch.group_type?.trim()) {
    throw new Error("A stable ID, group name and group type are required.");
  }
  const rows = await gateway.list();
  if (rows.some(row => row.id === identity.id || row.group_id === identity.id ||
      (stringKey(row.group_name) === stringKey(patch.group_name!) &&
       stringKey(row.group_type) === stringKey(patch.group_type!)))) {
    throw new Error("The participant group already exists. Refresh before retrying.");
  }
  const record: ParticipantGroup = {
    id: identity.id, group_id: identity.id,
    group_name: patch.group_name!, group_type: patch.group_type!,
    governance_body: patch.governance_body ?? "",
    membership_rule: patch.membership_rule ?? "",
    member_count: "0", quorum_rule: patch.quorum_rule ?? "N/A",
    description: patch.description ?? "", status: patch.status ?? "Active",
    created_at: identity.created_at,
    ...(patch.meeting_role !== undefined ? { meeting_role: patch.meeting_role } : {}),
    ...(patch.voting_eligible !== undefined ? { voting_eligible: patch.voting_eligible } : {}),
  };
  if ((await gateway.create(record)) !== true) {
    throw new Error("Participant group create was not confirmed by SQL.");
  }
  verifyReadback((await gateway.list()).find(row=>row.id===identity.id), record);
  return record;
}
export async function updateParticipantGroup(
  id: string, values: ParticipantGroupValues, gateway: ParticipantGroupGateway,
): Promise<boolean> {
  if (!id.trim()) throw new Error("A participant group ID is required.");
  const patch = normalize(values);
  const rows = await gateway.list();
  const existing = rows.find(row => row.id === id);
  if (!existing) throw new Error("Participant group not found. Refresh before retrying.");
  if (Object.keys(patch).length === 0) return true;
  if (rows.some(row => row.id !== id &&
      stringKey(row.group_name) === stringKey(patch.group_name ?? existing.group_name) &&
      stringKey(row.group_type) === stringKey(patch.group_type ?? existing.group_type))) {
    throw new Error("Another participant group already has that name and type.");
  }
  if ((await gateway.update(id, patch)) !== true) {
    throw new Error("Participant group update was not confirmed by SQL.");
  }
  verifyReadback((await gateway.list()).find(row=>row.id===id), { id, ...patch });
  return true;
}
