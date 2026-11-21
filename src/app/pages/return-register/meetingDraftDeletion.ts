import { convayAuth } from "../../services/supabase/convayAuth";

/** MT-27 staged contract: authorization, tenant, status, retention, revision,
 * linked records and idempotency are ultimately enforced by hosted SQL.
 * Do not activate the UI before the backend and recovery gates pass.
 */
export interface DraftDeletionSnapshot {
  recordId: string;
  title: string;
  revision: number;
}

function safeRecordId(value: string): string {
  const id = value.trim();
  if (!id || id.length > 180) throw new Error("A valid Draft meeting record ID is required.");
  return id;
}

function safeRevision(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("A valid saved Draft revision is required. Refresh the register.");
  }
  return value;
}

function meetingRecordPath(id: string): string {
  return "/rest/v1/convay_entity_records?entity_key=eq.bms.meetings" +
    "&record_id=eq." + encodeURIComponent(id) +
    "&select=record_id,payload,revision&limit=2";
}

/** Read the exact server revision before the user confirms deletion. */
export async function loadDraftDeletionSnapshot(recordId: string): Promise<DraftDeletionSnapshot> {
  const id = safeRecordId(recordId);
  const response = await convayAuth.authenticatedRequest(meetingRecordPath(id), { method: "GET" });
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] ||
      typeof rows[0] !== "object" || Array.isArray(rows[0])) {
    throw new Error("The Draft is unavailable or ambiguous. Refresh the register.");
  }
  const saved = rows[0] as Record<string, unknown>;
  if (saved.record_id !== id || !saved.payload ||
      typeof saved.payload !== "object" || Array.isArray(saved.payload)) {
    throw new Error("The Draft identity could not be verified.");
  }
  const payload = saved.payload as Record<string, unknown>;
  const approval = String(payload.approval_status ?? "").trim().toLowerCase();
  const lifecycle = String(payload.status ?? "").trim().toLowerCase();
  if (payload.id !== id || (!approval && !lifecycle) ||
      (approval && approval !== "draft") || (lifecycle && lifecycle !== "draft")) {
    throw new Error("Only a saved Draft meeting can be deleted.");
  }
  const revision = safeRevision(saved.revision as number);
  return { recordId: id, title: String(payload.meeting_title ?? "").trim(), revision };
}

/** Require matching 3-argument RPC ACK followed by absent-row readback. */
export async function deleteDraftMeeting(
  recordId: string,
  requestId: string,
  expectedRevision: number,
): Promise<"deleted" | "already_deleted"> {
  const id = safeRecordId(recordId);
  const key = requestId.trim();
  const revision = safeRevision(expectedRevision);
  if (!key || key.length > 180) throw new Error("A valid deletion request ID is required.");

  const response = await convayAuth.authenticatedRequest(
    "/rest/v1/rpc/convay_delete_draft_meeting",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_record_id: id,
        p_request_id: key,
        p_expected_revision: revision,
      }),
    },
  );
  const ack: unknown = await response.json();
  if (!ack || typeof ack !== "object" || Array.isArray(ack) ||
      (ack as Record<string, unknown>).record_id !== id ||
      (ack as Record<string, unknown>).request_id !== key ||
      !["deleted", "already_deleted"].includes(String((ack as Record<string, unknown>).outcome))) {
    throw new Error("The server did not confirm Draft deletion.");
  }
  const verify = await convayAuth.authenticatedRequest(meetingRecordPath(id), { method: "GET" });
  const remaining: unknown = await verify.json();
  if (!Array.isArray(remaining) || remaining.length !== 0) {
    throw new Error("The Draft deletion was not independently verified. Retry the same request.");
  }
  return (ack as { outcome: "deleted" | "already_deleted" }).outcome;
}
