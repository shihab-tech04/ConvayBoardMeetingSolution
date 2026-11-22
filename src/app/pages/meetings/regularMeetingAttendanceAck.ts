/**
 * LM-07/LM-09/LM-10 integration boundary — NOT connected to a deployed RPC.
 * A future WS0-owned SQL/Edge command must derive actor and tenant from the
 * signed-in session, enforce role/state/participant permissions atomically,
 * deduplicate request IDs and produce an authoritative quorum snapshot.
 *
 * Never use this transport as evidence that the hosted backend has been fixed.
 */
export type RegularMeetingAttendanceStatus =
  | "Present" | "Left" | "Temporarily Away" | "Excused" | "Recused";

export interface RegularAttendanceIntent {
  meetingId: string;
  participantId: string;
  nextStatus: RegularMeetingAttendanceStatus;
  expectedRevision: number;
  requestId: string;
}

export interface RegularAttendanceReceipt {
  requestId: string;
  meetingId: string;
  participantId: string;
  status: RegularMeetingAttendanceStatus;
  attendanceId: string;
  attendanceRevision: number;
  quorum: {
    revision: number;
    required: number;
    present: number;
    met: boolean;
  };
}

export interface RegularAttendanceGateway {
  /** Must use a signed-in, server-authorized endpoint; no client actor/tenant grant. */
  submit: (intent: RegularAttendanceIntent) => Promise<unknown>;
  /** Must read authorized, persisted attendance + quorum, not client cache. */
  readback: (meetingId: string, participantId: string) => Promise<unknown>;
}

export class AttendanceProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttendanceProofError";
  }
}

const statuses: readonly string[] = ["Present", "Left", "Temporarily Away", "Excused", "Recused"];
const isRow = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isId = (value: unknown): value is string =>
  typeof value === "string" && value.length >= 1 && value.length <= 180 && /^[A-Za-z0-9_-]+$/.test(value);
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

function validateIntent(intent: RegularAttendanceIntent) {
  if (!isId(intent.meetingId) || !isId(intent.participantId) ||
    !statuses.includes(intent.nextStatus) ||
    !isCount(intent.expectedRevision) ||
    !isId(intent.requestId) || intent.requestId.length < 16) {
    throw new AttendanceProofError("Invalid meeting attendance request.");
  }
}

function parseReceipt(value: unknown): RegularAttendanceReceipt {
  if (!isRow(value) || !isRow(value.quorum) ||
    !isId(value.meetingId) || !isId(value.participantId) ||
    !isId(value.requestId) || !isId(value.attendanceId) ||
    !statuses.includes(String(value.status)) ||
    !isCount(value.attendanceRevision) ||
    !isCount(value.quorum.revision) ||
    !isCount(value.quorum.required) ||
    !isCount(value.quorum.present) ||
    typeof value.quorum.met !== "boolean") {
    throw new AttendanceProofError("Attendance response lacks authenticated persistence proof.");
  }
  return value as unknown as RegularAttendanceReceipt;
}

/**
 * Returns a receipt only after both the server ACK and authoritative readback
 * agree. The UI must not update durable quorum state before this resolves.
 * Server-side authorization, SQL transactions and idempotency are separate
 * mandatory dependencies and are not implemented by this client helper.
 */
export async function submitAndVerifyRegularAttendance(
  intent: RegularAttendanceIntent,
  gateway: RegularAttendanceGateway,
): Promise<RegularAttendanceReceipt> {
  validateIntent(intent);
  const ack = parseReceipt(await gateway.submit(intent));
  if (ack.meetingId !== intent.meetingId || ack.participantId !== intent.participantId ||
    ack.requestId !== intent.requestId || ack.status !== intent.nextStatus ||
    ack.attendanceRevision <= intent.expectedRevision) {
    throw new AttendanceProofError("Attendance command acknowledgement did not match the request.");
  }
  const stored = parseReceipt(await gateway.readback(intent.meetingId, intent.participantId));
  if (stored.meetingId !== ack.meetingId || stored.participantId !== ack.participantId ||
    stored.requestId !== ack.requestId || stored.status !== ack.status ||
    stored.attendanceId !== ack.attendanceId || stored.attendanceRevision !== ack.attendanceRevision ||
    stored.quorum.revision !== ack.quorum.revision ||
    stored.quorum.required !== ack.quorum.required ||
    stored.quorum.present !== ack.quorum.present ||
    stored.quorum.met !== ack.quorum.met) {
    throw new AttendanceProofError("Attendance/quorum readback differs from the committed server acknowledgement.");
  }
  return stored;
}
