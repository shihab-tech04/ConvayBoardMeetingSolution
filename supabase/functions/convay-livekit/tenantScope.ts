import type { AdmissionDecision, OnlineLink, OnlineMeeting, OnlineSession } from "./admission.ts";

/**
 * The tenant ID is a column returned by authenticated PostgREST under RLS.
 * It is deliberately NOT read from meeting payloads, JWT user_metadata or
 * browser-supplied role/company input.
 */
export type SqlEntity<T> = { tenant_id: string | null; payload: T };

const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type RelatedEntity = SqlEntity<OnlineLink> | SqlEntity<OnlineSession>;

export function checkLiveKitTenantScope(
  meeting: SqlEntity<OnlineMeeting>,
  related: readonly RelatedEntity[],
): AdmissionDecision {
  const tenant = meeting?.tenant_id;
  if (tenant !== null && (typeof tenant !== "string" || !canonicalUuid.test(tenant))) {
    return { allowed: false, status: 403, error: "Meeting tenant authorization is unavailable." };
  }
  // A missing tenant_id SQL column is not a legacy/null tenant.
  // A member who belongs to multiple companies may see both companies' rows:
  // all matched attendance and session records MUST belong to this meeting.
  if (!Array.isArray(related) || related.some(row =>
    !row || !Object.prototype.hasOwnProperty.call(row, "tenant_id")
    || row.tenant_id !== tenant)) {
    return { allowed: false, status: 403, error: "Meeting records belong to different company scopes." };
  }
  return { allowed: true };
}

/**
 * Never rename a legacy live room: existing tokens and reopened-session
 * recovery continue using their established identities.
 * A scoped room cannot collide with a same-ID meeting in another company.
 */
export function scopedRoomIdentity(
  meeting: SqlEntity<OnlineMeeting>,
  legacyRoomIdentity: string,
): string {
  if (!legacyRoomIdentity || typeof legacyRoomIdentity !== "string") {
    throw new Error("A persisted meeting room identity is required");
  }
  if (!Object.prototype.hasOwnProperty.call(meeting, "tenant_id")) {
    throw new Error("Missing authoritative SQL tenant scope");
  }
  if (meeting.tenant_id === null) return legacyRoomIdentity;
  if (typeof meeting.tenant_id !== "string" || !canonicalUuid.test(meeting.tenant_id)) {
    throw new Error("Invalid tenant scope for online meeting");
  }
  return "tenant:" + meeting.tenant_id.toLowerCase() + ":" + legacyRoomIdentity;
}
