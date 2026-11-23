/**
 * GV-06 — fail-closed server-authoritative organizational unit move.
 * WS0 owns the future convay_move_org_unit SQL/RLS/transaction and API contract.
 * No multi-record client writes or client-created success audit permitted.
 */
export interface UnitMoveIntent {
  unit_id: string;
  expected_parent_id: string | null;
  new_parent_id: string;
  effective_date: string;
  reason: string;
  request_id: string;
}
export interface UnitMoveReceipt {
  unit_id: string;
  previous_parent_id: string | null;
  new_parent_id: string;
  request_id: string;
  revision: number;
  audit_event_id: string;
  history_record_id: string;
}
export interface UnitMoveGateway {
  send: (payload: UnitMoveIntent) => Promise<unknown>;
  read: (unitId: string) => Promise<{ parent_unit_id: string | null; revision: number } | null>;
}
function required(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
export async function commitAtomicUnitMove(intent: UnitMoveIntent, gateway: UnitMoveGateway): Promise<UnitMoveReceipt> {
  if (!required(intent.unit_id) || !required(intent.new_parent_id) || intent.new_parent_id === intent.unit_id)
    throw new Error("A different valid parent unit is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(intent.effective_date) ||
      !Number.isFinite(Date.parse(intent.effective_date + "T00:00:00Z")))
    throw new Error("A valid effective date is required.");
  if (!required(intent.reason) || !required(intent.request_id))
    throw new Error("A reason and stable request ID are required.");
  if (intent.expected_parent_id === intent.new_parent_id)
    throw new Error("The selected parent is already the current parent.");
  const ack = await gateway.send({
    unit_id: intent.unit_id, expected_parent_id: intent.expected_parent_id,
    new_parent_id: intent.new_parent_id, effective_date: intent.effective_date,
    reason: intent.reason.trim(), request_id: intent.request_id,
  });
  if (!ack || typeof ack !== "object") throw new Error("Server did not confirm the unit move.");
  const record = ack as Partial<UnitMoveReceipt>;
  if (record.unit_id !== intent.unit_id ||
      record.previous_parent_id !== intent.expected_parent_id ||
      record.new_parent_id !== intent.new_parent_id ||
      record.request_id !== intent.request_id ||
      !Number.isSafeInteger(record.revision) || (record.revision ?? 0) < 1 ||
      !required(record.audit_event_id) || !required(record.history_record_id))
    throw new Error("The move acknowledgement, revision or history is unverified.");
  const current = await gateway.read(intent.unit_id);
  if (!current || current.parent_unit_id !== intent.new_parent_id ||
      !Number.isSafeInteger(current.revision) || current.revision < record.revision!)
    throw new Error("Unit move readback is missing, stale or inconsistent. Reopen before retrying.");
  return record as UnitMoveReceipt;
}
