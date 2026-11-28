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
  tenantId?: string | null;
  sessionId?: string;
  attendanceMode?: "Online" | "In-Person" | null;
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
  // SQL omits participants without a current-session attendance record. Any
  // explicit own-row status must agree with the authoritative participant status.
  const ownStatus = Object.prototype.hasOwnProperty.call(value.attendanceMap, value.participantId)
    ? value.attendanceMap[value.participantId] : "Not Joined";
  if (ownStatus !== value.status) {
    throw new Error("Attendance participant status differs from the session snapshot.");
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

// The scope proof is mandatory for the coordinated scoped SQL/Edge activation.
function assertScopedProof(value: unknown, expectedSessionId: string, expectedTenantId?: string | null) {
  if (!isRecord(value) || value.sessionId !== expectedSessionId
    || !(value.tenantId === null || (typeof value.tenantId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.tenantId)))
    || (expectedTenantId !== undefined && value.tenantId !== expectedTenantId)) {
    throw new Error("Attendance session or company changed. Reconnect before retrying.");
  }
}
export async function readLiveAttendance(
  meetingId: string, participantId: string, expectedSessionId?: string, expectedTenantId?: string | null,
): Promise<LiveAttendanceSnapshot> {
  const result = await gateway({ action: "readback", meetingId, participantId, ...(expectedSessionId ? { expectedSessionId, expectedTenantId } : {}) });
  if (expectedSessionId) assertScopedProof(result, expectedSessionId, expectedTenantId);
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
  expectedSessionId?: string,
): Promise<LiveAttendanceSnapshot> {
  // This prevents obsolete queued client work, not a substitute for server authorization.
  const assertCurrentScope = () => {
    if (!isCurrentScope()) throw new Error("Meeting attendance scope changed. Refresh before retrying.");
  };
  assertCurrentScope();
  // Never assume a local cached revision. The read is scoped by the real actor
  // server-side, so an old tab cannot overwrite a newer participant record.
  const initial = await readLiveAttendance(meetingId, participantId, expectedSessionId);
  assertCurrentScope();
  const intent: RegularAttendanceIntent = {
    meetingId, participantId, nextStatus,
    expectedRevision: initial.attendanceRevision,
    requestId: "lmatt_" + crypto.randomUUID().replace(/-/g, ""),
  };
  const receipt = await submitAndVerifyRegularAttendance(intent, {
    submit: async current => {
      assertCurrentScope();
      const ack = await gateway({
        action: "commit",
        meetingId: current.meetingId,
        participantId: current.participantId,
        nextStatus: current.nextStatus,
        expectedRevision: current.expectedRevision,
        requestId: current.requestId,
        attendanceMode,
        ...(expectedSessionId ? { expectedSessionId, expectedTenantId: initial.tenantId } : {}),
      });
      if (expectedSessionId) assertScopedProof(ack, expectedSessionId, initial.tenantId);
      if (expectedSessionId && initial.tenantId !== null && (!isRecord(ack) || ack.attendanceMode !== attendanceMode)) {
        throw new Error("Attendance mode acknowledgement did not match the request.");
      }
      return ack;
    },
    readback: async (id, participant) => {
      assertCurrentScope();
      const saved = await readLiveAttendance(id, participant, expectedSessionId, initial.tenantId);
      if (expectedSessionId) assertScopedProof(saved, expectedSessionId, initial.tenantId);
      if (expectedSessionId && initial.tenantId !== null && saved.attendanceMode !== attendanceMode) {
        throw new Error("Attendance mode readback differs from the committed command.");
      }
      return saved;
    },
  });
  assertCurrentScope();
  const full = validateReadback(receipt);
  if (full.meetingId !== meetingId || full.participantId !== participantId) {
    throw new Error("Server attendance identity changed after commit.");
  }
  return full;
}
