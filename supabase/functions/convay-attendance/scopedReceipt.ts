/** Staged session-scoped RPC handshake. The requested session is a precondition, not an authorization grant. */
const idPattern = /^[A-Za-z0-9_-]{1,180}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AttendanceScope = { tenantId: string | null; sessionId: string };
export function scopeFromPersistedSession(tenantId: unknown, sessionId: unknown, requestedSessionId: unknown, expectedTenantId?: unknown): AttendanceScope {
  if (tenantId !== null && (typeof tenantId !== "string" || !uuidPattern.test(tenantId))) {
    throw new Error("Meeting company authorization denied.");
  }
  if (typeof sessionId !== "string" || !idPattern.test(sessionId) || requestedSessionId !== sessionId) {
    throw new Error("Live session changed. Reconnect before retrying.");
  }
  if (expectedTenantId !== undefined && expectedTenantId !== tenantId) throw new Error("Meeting company authorization denied.");
  return { tenantId, sessionId };
}
export function scopedRpcArgs(scope: AttendanceScope) {
  return { p_tenant_id: scope.tenantId, p_session_id: scope.sessionId };
}
export function verifyScopedReceipt(value: unknown, scope: AttendanceScope, meetingId: string, participantId: string, expectedMode?: "Online" | "In-Person") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Attendance scope readback unavailable.");
  const row = value as Record<string, unknown>;
  if (row.tenantId !== scope.tenantId || row.sessionId !== scope.sessionId || row.meetingId !== meetingId || row.participantId !== participantId) {
    throw new Error("Attendance scope changed. Reconnect before retrying.");
  }
  // A company write must prove its mode as well as its exact session. Legacy
  // receipts created before the scoped rollout remain backward compatible.
  if (scope.tenantId !== null && expectedMode !== undefined && row.attendanceMode !== expectedMode) {
    throw new Error("Attendance mode readback differs from the requested command.");
  }
  return row;
}
