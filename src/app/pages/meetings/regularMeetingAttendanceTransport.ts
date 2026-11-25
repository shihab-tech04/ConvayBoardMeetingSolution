import { convayAuth } from "../../services/supabase/convayAuth";
import {
  submitAndVerifyRegularAttendance,
  type RegularAttendanceIntent,
  type RegularAttendanceReceipt,
  type RegularMeetingAttendanceStatus,
} from "./regularMeetingAttendanceAck";

/**
 * The only production transport for online meeting attendance.
 * The browser NEVER supplies an actor ID or a provider-verification claim.
 * Every mutation is accepted only after the Edge gateway, transactional SQL
 * and an independent, authorized readback agree on the same revision.
 */
export interface LiveAttendanceSnapshot extends RegularAttendanceReceipt {
  attendanceMap: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const validAttendanceStatuses: ReadonlySet<string> = new Set<RegularMeetingAttendanceStatus>([
  "Not Joined", "Present", "Left", "Temporarily Away", "Excused", "Recused",
]);
function isAttendanceStatus(value: unknown): value is RegularMeetingAttendanceStatus {
  return typeof value === "string" && validAttendanceStatuses.has(value);
}
function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function isQuorum(value: unknown): value is LiveAttendanceSnapshot["quorum"] {
  return isRecord(value) && isNonnegativeInteger(value.revision)
    && isNonnegativeInteger(value.required)
    && isNonnegativeInteger(value.present)
    && typeof value.met === "boolean";
}
function validateReadback(value: unknown): LiveAttendanceSnapshot {
  if (!isRecord(value) || typeof value.meetingId !== "string"
      || typeof value.participantId !== "string" || !isAttendanceStatus(value.status)
      || !isNonnegativeInteger(value.attendanceRevision)
      || typeof value.requestId !== "string" || typeof value.attendanceId !== "string"
      || !isQuorum(value.quorum) || !isRecord(value.attendanceMap)
      || !Object.values(value.attendanceMap).every(isAttendanceStatus)) {
    throw new Error("The server did not return a complete attendance and quorum snapshot.");
  }
  return value as unknown as LiveAttendanceSnapshot;
}
async function gateway(body: Record<string, unknown>): Promise<unknown> {
  const response = await convayAuth.authenticatedRequest("/functions/v1/convay-attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await response.json() as unknown;
}

export async function readLiveAttendance(
  meetingId: string, participantId: string,
): Promise<LiveAttendanceSnapshot> {
  const result = await gateway({ action: "readback", meetingId, participantId });
  const snapshot = validateReadback(result);
  if (snapshot.meetingId !== meetingId || snapshot.participantId !== participantId) {
    throw new Error("Attendance readback belongs to another meeting or participant.");
  }
  return snapshot;
}

export async function commitLiveAttendance(
  meetingId: string,
  participantId: string,
  nextStatus: RegularMeetingAttendanceStatus,
  attendanceMode: "Online" | "In-Person",
  isCurrentScope: () => boolean = () => true,
): Promise<LiveAttendanceSnapshot> {
  // This prevents obsolete queued client work, not a substitute for server authorization.
  const assertCurrentScope = () => {
    if (!isCurrentScope()) throw new Error("Meeting attendance scope changed. Refresh before retrying.");
  };
  assertCurrentScope();
  // Never assume a local cached revision. The read is scoped by the real actor
  // server-side, so an old tab cannot overwrite a newer participant record.
  const initial = await readLiveAttendance(meetingId, participantId);
  assertCurrentScope();
  const intent: RegularAttendanceIntent = {
    meetingId, participantId, nextStatus,
    expectedRevision: initial.attendanceRevision,
    requestId: "lmatt_" + crypto.randomUUID().replace(/-/g, ""),
  };
  const receipt = await submitAndVerifyRegularAttendance(intent, {
    submit: current => {
      assertCurrentScope();
      return gateway({
        action: "commit",
        meetingId: current.meetingId,
        participantId: current.participantId,
        nextStatus: current.nextStatus,
        expectedRevision: current.expectedRevision,
        requestId: current.requestId,
        attendanceMode,
      });
    },
    readback: (id, participant) => {
      assertCurrentScope();
      return readLiveAttendance(id, participant);
    },
  });
  assertCurrentScope();
  const full = validateReadback(receipt);
  if (full.meetingId !== meetingId || full.participantId !== participantId) {
    throw new Error("Server attendance identity changed after commit.");
  }
  return full;
}
