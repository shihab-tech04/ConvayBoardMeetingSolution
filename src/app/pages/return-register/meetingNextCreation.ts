import { convayAuth } from "../../services/supabase/convayAuth";

/**
 * MT-26: client-side prefill only. Database must independently validate source,
 * Completed status, revision, actor, tenant, permission and immutable provenance.
 */
export function nextMeetingDefaults(source: Record<string, unknown>): Record<string, string> {
  if (String(source.approval_status ?? source.status ?? "").trim() !== "Completed") {
    throw new Error("Only a Completed meeting can be continued.");
  }
  if (!String(source.meeting_id ?? source.id ?? "").trim()) {
    throw new Error("Source meeting ID is required.");
  }
  const fields = ["meeting_title", "committee", "meeting_type", "language", "confidentiality"] as const;
  const defaults: Record<string, string> = {};
  for (const key of fields) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) defaults[key] = value.trim();
  }
  // Do not copy IDs, date, time, participants, agenda, documents, approval,
  // history, attendance, decisions, votes, or auth/tenant metadata.
  return defaults;
}

export interface CreateNextMeetingCommand {
  sourceMeetingId: string;
  sourceRevision: number;
  requestId: string;
  next: {
    meeting_title: string; committee: string; meeting_type: string;
    meeting_date: string; start_time: string; end_time: string;
    time_zone: string; mode: string;
    language?: string; confidentiality?: string; purpose?: string;
  };
}

export interface CreateNextMeetingAck {
  source_meeting_id: string;
  new_meeting_id: string;
  request_id: string;
  outcome: "created" | "already_created";
}

/** No production button uses this transport until the real RPC is installed. */
export async function createNextMeeting(
  command: CreateNextMeetingCommand,
): Promise<CreateNextMeetingAck> {
  const source = command.sourceMeetingId.trim();
  const key = command.requestId.trim();
  if (!source || !key || source.length > 180 || key.length > 180) {
    throw new Error("Valid source meeting ID and request ID are required.");
  }
  if (!Number.isSafeInteger(command.sourceRevision) || command.sourceRevision < 1) {
    throw new Error("A valid source revision is required.");
  }

  const approvedKeys = [
    "meeting_title", "committee", "meeting_type", "meeting_date",
    "start_time", "end_time", "time_zone", "mode",
    "language", "confidentiality", "purpose",
  ] as const;
  const requiredKeys = approvedKeys.slice(0, 8);
  if (!command.next || typeof command.next !== "object" || Array.isArray(command.next)) {
    throw new Error("Reviewed next meeting details are required.");
  }
  const input = command.next as unknown as Record<string, unknown>;
  if (Object.keys(input).some(k => !approvedKeys.includes(k as typeof approvedKeys[number]))) {
    throw new Error("Unapproved carry-forward field supplied.");
  }
  const next: Record<string, string> = {};
  for (const field of approvedKeys) {
    const value = input[field];
    if (value !== undefined) {
      if (typeof value !== "string" || value.length > 500) {
        throw new Error("Invalid " + field + ".");
      }
      next[field] = value.trim();
    }
  }
  for (const field of requiredKeys) {
    if (!next[field]) throw new Error("Missing " + field + ".");
  }

  const response = await convayAuth.authenticatedRequest(
    "/rest/v1/rpc/convay_create_next_meeting",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_source_meeting_id: source,
        p_expected_source_revision: command.sourceRevision,
        p_request_id: key,
        p_next_values: next,
      }),
    },
  );
  const ack = await response.json() as Partial<CreateNextMeetingAck> | null;
  if (!ack ||
      ack.source_meeting_id !== source ||
      ack.request_id !== key ||
      typeof ack.new_meeting_id !== "string" ||
      !ack.new_meeting_id.trim() ||
      ack.new_meeting_id === source ||
      (ack.outcome !== "created" && ack.outcome !== "already_created")) {
    throw new Error("Server did not confirm the independent next meeting.");
  }
  // Server ACK alone is not proof of a durable new meeting. Require an
  // authenticated row-level-policy read of the exact new record, including its
  // immutable source link, independent identity, Draft status and revision.
  // A failed readback leaves the stable request key reusable for retry.
  const readbackResponse = await convayAuth.authenticatedRequest(
    "/rest/v1/convay_entity_records?entity_key=eq.bms.meetings" +
    "&record_id=eq." + encodeURIComponent(ack.new_meeting_id) +
    "&select=record_id,payload,revision&limit=2",
    { method: "GET" },
  );
  const rows: unknown = await readbackResponse.json();
  if (!Array.isArray(rows) || rows.length !== 1 ||
      !rows[0] || typeof rows[0] !== "object") {
    throw new Error("The next meeting could not be verified after saving.");
  }
  const saved = rows[0] as Record<string, unknown>;
  const payload = saved.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The next meeting could not be verified after saving.");
  }
  const meeting = payload as Record<string, unknown>;
  if (
    saved.record_id !== ack.new_meeting_id ||
    meeting.id !== ack.new_meeting_id ||
    meeting.meeting_id !== ack.new_meeting_id ||
    meeting.source_meeting_id !== source ||
    meeting.approval_status !== "Draft" ||
    typeof saved.revision !== "number" ||
    !Number.isSafeInteger(saved.revision) ||
    saved.revision < 1
  ) {
    throw new Error("The next meeting source, Draft state or revision did not persist.");
  }
  return ack as CreateNextMeetingAck;
}
