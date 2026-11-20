import { convayAuth } from "../../services/supabase/convayAuth";

/**
 * MT-27 user request contract. SQL owns Draft/status, actor, tenant, revision,
 * retention and linked-record checks. Never treat client filtering as authority.
 * Until WS0 closes direct REST and batch bypasses, this is not release-ready.
 */
export async function deleteDraftMeeting(
  recordId: string,
  requestId: string,
): Promise<"deleted" | "already_deleted"> {
  const id = recordId.trim();
  const key = requestId.trim();
  if (!id || !key) throw new Error("Meeting ID and request ID are required.");
  const response = await convayAuth.authenticatedRequest(
    "/rest/v1/rpc/convay_delete_draft_meeting",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_record_id: id, p_request_id: key }),
    },
  );
  const ack = await response.json() as {
    record_id?: unknown; request_id?: unknown; outcome?: unknown;
  };
  if (
    ack?.record_id !== id ||
    ack?.request_id !== key ||
    (ack?.outcome !== "deleted" && ack?.outcome !== "already_deleted")
  ) throw new Error("The server did not confirm Draft deletion.");
  return ack.outcome;
}
