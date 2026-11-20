/** LM-06: keep minutes-capture state tied to SQL acknowledgement and readback.
 * The RPC must enforce actual JWT actor/meeting/tenant/role permissions. */
export type MinutesCaptureStatus = "not_started" | "active" | "completed";
export type MinutesAction = "start" | "complete";
export interface MinutesSession {
  id: string;
  meeting_id: string;
  session_status: string;
  minutes_capture_status: string;
}
export interface MinutesWrite {
  entity_key: string;
  action: "update" | "create";
  record_id: string;
  payload: Record<string, unknown>;
}
export interface MinutesCaptureRequest {
  meetingId: string;
  actorId: string;
  session: MinutesSession;
  action: MinutesAction;
  confirmedSavedMinutes: boolean;
  at: string;
  applyBatch: (operations: MinutesWrite[]) => Promise<number>;
  readSessions: () => Promise<MinutesSession[]>;
}
export function plannedMinutesStatus(input: MinutesCaptureRequest): MinutesCaptureStatus {
  const { meetingId, actorId, session, action, confirmedSavedMinutes } = input;
  if (!meetingId.trim() || !actorId.trim() || !session.id.trim() || session.meeting_id !== meetingId) {
    throw new Error("A valid meeting, session and signed-in participant are required.");
  }
  if (action === "start") {
    if (session.session_status !== "active" || session.minutes_capture_status !== "not_started") {
      throw new Error("Minutes capture can start only once during an active meeting.");
    }
    return "active";
  }
  if (action !== "complete") throw new Error("Unsupported minutes action.");
  if (session.session_status !== "ended" || session.minutes_capture_status !== "active") {
    throw new Error("End the meeting and finish its review checklist before completing minutes.");
  }
  if (!confirmedSavedMinutes) {
    throw new Error("Save the actual meeting minutes before completing capture.");
  }
  return "completed";
}
export async function commitVerifiedMinutesCapture(input: MinutesCaptureRequest): Promise<MinutesCaptureStatus> {
  const next = plannedMinutesStatus(input); // reject unsupported / duplicate before any write
  const eventId = "MIN-CAP-" + input.session.id + "-" + input.action;
  const eventName = input.action === "start" ? "Minutes capture started" : "Minutes capture completed";
  const operations: MinutesWrite[] = [
    { entity_key: "bms.liveSessions", action: "update", record_id: input.session.id,
      payload: { minutes_capture_status: next } },
    { entity_key: "bms.meetingInteractions", action: "create", record_id: eventId,
      payload: {
        id: eventId, meeting_id: input.meetingId, user_id: input.actorId,
        interaction_type: "host_action", content: eventName,
        metadata: { event: "minutes_" + input.action, time: input.at },
        created_at: input.at,
      } },
  ];
  const acknowledged = await input.applyBatch(operations);
  if (acknowledged !== operations.length) throw new Error("Minutes state/audit transaction was not fully acknowledged.");
  const matches = (await input.readSessions()).filter(session =>
    session.id === input.session.id && session.meeting_id === input.meetingId);
  if (matches.length !== 1 || matches[0].minutes_capture_status !== next) {
    throw new Error("Minutes state could not be verified from the server. Refresh before retrying.");
  }
  return next;
}
