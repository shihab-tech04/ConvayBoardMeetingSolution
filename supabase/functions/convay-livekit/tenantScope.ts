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

/** Canonical room identity shared by token issuance and attendance verification. */
export function resolveLiveKitRoomIdentity(meeting: SqlEntity<OnlineMeeting>, session: OnlineSession, meetingId: string): string {
  if (session.reopen_started_at && (!session.id || !/^SES-[A-Za-z0-9_-]+-R[0-9]+$/.test(session.id))) {
    throw new Error("Recovered meeting session identity is invalid.");
  }
  const id = meeting.payload.id ?? meeting.payload.meeting_id ?? meetingId;
  const legacyRoomIdentity = session.reopen_started_at ? `${id}:${session.id}` : id;
  return scopedRoomIdentity(meeting, legacyRoomIdentity);
}

export async function opaqueId(kind: string, value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("convay-livekit-v1:" + kind + ":" + value));
  return "cv-" + kind + "-" + Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

/** A single authenticated registry lookup must cover both SQL and business IDs.
 * Never choose a direct record over a different row with the same business ID. */
export type SavedMeetingRow = SqlEntity<OnlineMeeting> & { record_id: string };
export function meetingLookupParams(meetingId: string): URLSearchParams {
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(meetingId)) throw new Error("Invalid meeting identity");
  return new URLSearchParams({
    select: "record_id,tenant_id,payload", entity_key: "eq.bms.meetings",
    or: "(record_id.eq." + meetingId + ",payload->>meeting_id.eq." + meetingId + ",payload->>id.eq." + meetingId + ")",
    limit: "2",
  });
}
export function uniqueSavedMeeting(rows: SavedMeetingRow[], requestedId: string): SavedMeetingRow | null {
  if (rows.length > 1) throw new Error("Ambiguous meeting identity");
  const meeting = rows[0];
  if (!meeting) return null;
  const canonicalId = meeting.payload?.meeting_id ?? meeting.payload?.id;
  if (!meeting.record_id || !canonicalId || !/^[A-Za-z0-9_-]{1,180}$/.test(canonicalId)
      || ![meeting.record_id, meeting.payload.meeting_id, meeting.payload.id].includes(requestedId)) {
    throw new Error("Inconsistent saved meeting identity");
  }
  return meeting;
}
/** Until the privileged attendance RPCs are tenant scoped, do not allow a
 * tenant-owned media session to enter a legacy persistence boundary. */
export function checkAttendancePersistenceScope(meeting: SqlEntity<OnlineMeeting>): AdmissionDecision {
  if (meeting.tenant_id !== null) {
    return { allowed: false, status: 409, error: "Company live attendance is not yet available." };
  }
  return { allowed: true };
}
