/**
 * GV-08 Unit Head: server-transaction contract for assignments and termination.
 * Only a server-authorized transaction may update the assignment, projected
 * organization head and immutable history. This helper has no direct writes.
 * WS0/WS-F must implement the actual permission/tenant/membership enforcement.
 */
export type UnitHeadRole = "Permanent Head" | "Acting Head" | "Deputy";
export type UnitHeadMutation =
  | {
      operation: "assign";
      unit_id: string;
      user_id: string;
      assignment_type: UnitHeadRole;
      start_date: string;
      end_date: string | null;
      reason: string;
      request_id: string;
    }
  | {
      operation: "end";
      unit_id: string;
      record_id: string;
      request_id: string;
    };

export interface UnitHeadReceipt {
  operation: "assign" | "end";
  unit_id: string;
  record_id: string;
  assignment_id: string;
  user_id: string;
  assignment_type: UnitHeadRole;
  status: "active" | "scheduled" | "ended";
  request_id: string;
  revision: number;
  unit_revision: number;
  audit_event_id: string;
  history_record_id: string;
  membership_verified: boolean;
  head_user_id: string | null;
  deputy_user_id: string | null;
}
export interface UnitHeadServerRead {
  payload: {
    id: string;
    unit_id: string;
    user_id: string;
    assignment_type: string;
    status: string;
  };
  revision: number;
}
export interface UnitHeadUnitRead {
  payload: {
    id: string;
    head_user_id?: string | null;
    deputy_user_id?: string | null;
  };
  revision: number;
}
export interface UnitHeadGateway {
  send: (intent: UnitHeadMutation) => Promise<unknown>;
  readAssignment: (recordId: string) => Promise<UnitHeadServerRead | null>;
  readUnit: (unitId: string) => Promise<UnitHeadUnitRead | null>;
}
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
const goodRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const normalized = (value: string | null | undefined): string | null => value || null;

/**
 * Treat a provider/SQL ACK as unverified until the exact record AND projected
 * organization fields have both been read back at the acknowledged revisions.
 * Do not report success based on UI state, simulated fixtures, or HTTP 200.
 */
export async function commitUnitHeadMutation(
  intent: UnitHeadMutation, gateway: UnitHeadGateway,
): Promise<UnitHeadReceipt> {
  if (!nonempty(intent.unit_id) || !nonempty(intent.request_id))
    throw new Error("The unit and stable request ID are required.");
  if (intent.operation === "assign") {
    if (!nonempty(intent.user_id) ||
        !["Permanent Head", "Acting Head", "Deputy"].includes(intent.assignment_type))
      throw new Error("A valid eligible user and leadership type are required.");
    if (!validDay(intent.start_date) || (intent.end_date &&
        (!validDay(intent.end_date) || intent.end_date < intent.start_date)))
      throw new Error("Valid effective dates in chronological order are required.");
  } else if (!nonempty(intent.record_id)) {
    throw new Error("The original assignment record ID is required.");
  }

  const ack = await gateway.send(intent);
  if (!ack || typeof ack !== "object" || Array.isArray(ack))
    throw new Error("The leadership transaction has no authoritative server acknowledgement.");
  const receipt = ack as Partial<UnitHeadReceipt>;
  if (receipt.operation !== intent.operation ||
      receipt.unit_id !== intent.unit_id ||
      receipt.request_id !== intent.request_id ||
      !nonempty(receipt.record_id) || !nonempty(receipt.assignment_id) ||
      !nonempty(receipt.user_id) ||
      !["Permanent Head", "Acting Head", "Deputy"].includes(receipt.assignment_type as string) ||
      !goodRevision(receipt.revision) || !goodRevision(receipt.unit_revision) ||
      !nonempty(receipt.audit_event_id) || !nonempty(receipt.history_record_id) ||
      !Object.prototype.hasOwnProperty.call(receipt, "head_user_id") ||
      !Object.prototype.hasOwnProperty.call(receipt, "deputy_user_id") ||
      (receipt.head_user_id !== null && typeof receipt.head_user_id !== "string") ||
      (receipt.deputy_user_id !== null && typeof receipt.deputy_user_id !== "string"))
    throw new Error("The leadership acknowledgement, revision or immutable audit/history is unverified.");

  if (intent.operation === "assign") {
    if (receipt.user_id !== intent.user_id ||
        receipt.assignment_type !== intent.assignment_type ||
        !["active", "scheduled"].includes(receipt.status ?? "") ||
        receipt.membership_verified !== true)
      throw new Error("The server has not verified the eligible member and assignment.");
  } else if (receipt.record_id !== intent.record_id || receipt.status !== "ended") {
    throw new Error("The server did not confirm termination of the selected assignment.");
  }

  const [assignment, unit] = await Promise.all([
    gateway.readAssignment(receipt.record_id!),
    gateway.readUnit(intent.unit_id),
  ]);
  if (!assignment || assignment.payload.id !== receipt.record_id ||
      assignment.payload.unit_id !== intent.unit_id ||
      assignment.payload.user_id !== receipt.user_id ||
      assignment.payload.assignment_type !== receipt.assignment_type ||
      assignment.payload.status !== receipt.status ||
      assignment.revision !== receipt.revision ||
      !unit || unit.payload.id !== intent.unit_id ||
      unit.revision !== receipt.unit_revision ||
      normalized(unit.payload.head_user_id) !== normalized(receipt.head_user_id) ||
      normalized(unit.payload.deputy_user_id) !== normalized(receipt.deputy_user_id))
    throw new Error("Leadership assignment readback is missing, stale or inconsistent. Refresh before retrying.");
  return receipt as UnitHeadReceipt;
}
