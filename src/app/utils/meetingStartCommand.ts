/**
 * The meeting status and live-session record must be committed together.
 * This is a pure API-command builder; it never marks the UI live by itself.
 */
export type StartSessionSnapshot = {
  id: string;
  session_status?: string;
  started_at?: string;
  started_by?: string;
};

export type MeetingStartOperation = {
  entity_key: "bms.meetings" | "bms.liveSessions";
  action: "create" | "update";
  record_id: string;
  payload: { id?: string; [key: string]: unknown };
};

export function buildMeetingStartBatch(input: {
  meetingRecordId: string;
  meetingId: string;
  actorId: string;
  startedAt: string;
  existingSession?: StartSessionSnapshot;
}): MeetingStartOperation[] {
  const { meetingRecordId, meetingId, actorId, startedAt, existingSession } = input;
  if (!meetingRecordId.trim() || !meetingId.trim() || !actorId.trim() || !startedAt.trim()) {
    throw new Error("Missing meeting or authenticated actor");
  }
  if (existingSession?.session_status === "ended") {
    throw new Error("A closed meeting cannot be restarted without an approved reopening workflow.");
  }
  const sessionId = existingSession?.id || `SES-${meetingId}`;
  const sessionOp: MeetingStartOperation = existingSession
    ? {
        entity_key: "bms.liveSessions",
        action: "update",
        record_id: sessionId,
        payload: {
          session_status: "active",
          started_at: existingSession.started_at || startedAt,
          started_by: existingSession.started_by || actorId,
        },
      }
    : {
        entity_key: "bms.liveSessions",
        action: "create",
        record_id: sessionId,
        payload: {
          id: sessionId,
          meeting_id: meetingId,
          session_status: "active",
          started_at: startedAt,
          started_by: actorId,
          recording_status: "not_started",
          transcription_status: "not_started",
          minutes_capture_status: "not_started",
          created_at: startedAt,
        },
      };
  return [
    {
      entity_key: "bms.meetings",
      action: "update",
      record_id: meetingRecordId,
      payload: { approval_status: "In Progress" },
    },
    sessionOp,
  ];
}
