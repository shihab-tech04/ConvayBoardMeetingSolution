import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AccessToken, RoomServiceClient } from "npm:livekit-server-sdk@2.19.2";
import { checkOnlineAdmission, checkOnlineRoomCapacity, type OnlineMeeting, type OnlineLink, type OnlineSession } from "./admission.ts";
import { canPublishOnlineMeeting } from "./publisherGrant.ts";
import { scopeFromPersistedSession, scopedRpcArgs, verifyScopedReceipt, type AttendanceScope } from "../convay-attendance/scopedReceipt.ts";
import { checkLiveKitTenantScope, resolveLiveKitRoomIdentity, opaqueId, meetingLookupParams, uniqueSavedMeeting, checkAttendancePersistenceScope, type SavedMeetingRow, type SqlEntity } from "./tenantScope.ts";

/**
 * Server-side LiveKit admission. The browser never holds an API secret.
 * JWT validation is deliberately repeated here even when the Edge gateway
 * verifies the Authorization header, to tie the token to an active user.
 */
const MAX_LIVEKIT_PARTICIPANTS = 4;
const EMPTY_ROOM_TIMEOUT_SECONDS = 600;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const origins = new Set(["https://shihab-tech04.github.io", "http://localhost:5173", "http://127.0.0.1:5173"]);
function headers(req: Request): Headers {
  const h = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" });
  const origin = req.headers.get("Origin");
  if (origin && origins.has(origin)) h.set("Access-Control-Allow-Origin", origin);
  h.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return h;
}
function response(req: Request, status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), { status, headers: headers(req) });
}
type RecordRow<T> = SqlEntity<T>;
async function jsonRequest<T>(path: string, jwt: string, init?: RequestInit): Promise<T> {
  const res = await fetch(SUPABASE_URL + path, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + jwt,
      "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Convay account or registry verification failed (" + res.status + ").");
  return await res.json() as T;
}
async function entityRows<T>(entity: string, meetingId: string, jwt: string): Promise<SqlEntity<T>[]> {
  const query = new URLSearchParams({
    select: "tenant_id,payload",
    entity_key: "eq." + entity,
    "payload->>meeting_id": "eq." + meetingId,
    limit: "1000",
  });
  return await jsonRequest<RecordRow<T>[]>(
    "/rest/v1/convay_entity_records?" + query.toString(), jwt
  );
}
async function savedMeeting(meetingId: string, jwt: string): Promise<SavedMeetingRow | null> {
  const lookup = async (id: string) => uniqueSavedMeeting(await jsonRequest<SavedMeetingRow[]>(
    "/rest/v1/convay_entity_records?" + meetingLookupParams(id).toString(), jwt), id);
  const row = await lookup(meetingId);
  if (!row) return null;
  const canonical = row.payload.meeting_id ?? row.payload.id!;
  if (canonical !== meetingId) {
    const canonicalRow = await lookup(canonical);
    if (!canonicalRow || canonicalRow.record_id !== row.record_id || canonicalRow.tenant_id !== row.tenant_id) {
      throw new Error("Ambiguous meeting identity");
    }
  }
  return row;
}
/** Company admission remains closed until the coordinated scoped SQL, attendance
 * Edge and regular client release is verified. A flag alone cannot authorize a room. */
async function scopedAttendanceReady(scope: AttendanceScope, meetingId: string, actorId: string): Promise<boolean> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (Deno.env.get("CONVAY_SCOPED_ATTENDANCE_ENABLED") !== "true" || !serviceKey) return false;
  try {
    const proof = await fetch(SUPABASE_URL + "/rest/v1/rpc/convay_read_live_attendance_scoped", {
      method: "POST", cache: "no-store",
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ p_actor_id: actorId, p_meeting_id: meetingId, p_participant_id: actorId, ...scopedRpcArgs(scope) }),
    });
    if (!proof.ok) return false;
    return verifyScopedReceipt(await proof.json(), scope, meetingId, actorId).releaseEnabled === true;
  } catch { return false; }
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return response(req, 405, { error: "Method not allowed." });
  const bearer = req.headers.get("Authorization") ?? "";
  if (!bearer.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_KEY) {
    return response(req, 401, { error: "A valid Convay sign-in is required." });
  }
  const jwt = bearer.slice("Bearer ".length).trim();
  let body: { meetingId?: unknown; expectedSessionId?: unknown };
  try { body = await req.json(); }
  catch { return response(req, 400, { error: "Invalid request." }); }
  const meetingId = body?.meetingId;
  const expectedSessionId = body?.expectedSessionId;
  if (typeof meetingId !== "string" || !/^[A-Za-z0-9_-]{1,180}$/.test(meetingId)
    || typeof expectedSessionId !== "string" || !/^[A-Za-z0-9_-]{1,180}$/.test(expectedSessionId)) {
    return response(req, 400, { error: "A valid saved meeting identity is required." });
  }
  try {
    const user = await jsonRequest<{ id?: string }>("/auth/v1/user", jwt);
    if (!user.id) return response(req, 401, { error: "Sign in to Convay." });
    const profileQuery = new URLSearchParams({
      select: "user_id,display_name,account_status", user_id: "eq." + user.id, limit: "1",
    });
    const profiles = await jsonRequest<Array<{ account_status: string; display_name: string }>>(
      "/rest/v1/user_profiles?" + profileQuery.toString(), jwt
    );
    if (profiles[0]?.account_status !== "active") {
      return response(req, 403, { error: "Your account is not active." });
    }
    const snapshot = await jsonRequest<{ is_super_admin?: boolean; effective_permissions?: string[] }>(
      "/functions/v1/convay-access", jwt,
      { method: "POST", body: JSON.stringify({ action: "snapshot" }) }
    );
    const meeting = await savedMeeting(meetingId, jwt);
    if (!meeting) return response(req, 404, { error: "The saved meeting was not found." });
    const canonicalMeetingId = meeting.payload.meeting_id ?? meeting.payload.id ?? meetingId;
    const [links, sessions] = await Promise.all([
      entityRows<OnlineLink>("bms.meetingParticipantLinks", canonicalMeetingId, jwt),
      entityRows<OnlineSession>("bms.liveSessions", canonicalMeetingId, jwt),
    ]);
    // SQL RLS first authorizes each row. Compare their authoritative tenant
    // columns as a second boundary before granting any provider token.
    const scope = checkLiveKitTenantScope(meeting, [...links, ...sessions]);
    if (!scope.allowed) return response(req, scope.status, { error: scope.error });
    const persistence = checkAttendancePersistenceScope(meeting);
    // Retain the tenant gate unless the explicitly activated scoped contract also proves the current participant.
    if (!persistence.allowed && Deno.env.get("CONVAY_SCOPED_ATTENDANCE_ENABLED") !== "true") return response(req, persistence.status, { error: persistence.error });
    // SQL attendance requires exactly one active or paused session.
    // Do not issue provider credentials for contradictory live-session records.
    const activeSessions = sessions.filter(item => item.payload?.session_status === "active" || item.payload?.session_status === "paused");
    if (activeSessions.length !== 1) return response(req, 409, { error: "Meeting session state is inconsistent." });
    const session = activeSessions[0].payload;
    let attendanceScope: AttendanceScope;
    try { attendanceScope = scopeFromPersistedSession(meeting.tenant_id, session.id, expectedSessionId); }
    catch { return response(req, 409, { error: "The live session changed. Reopen the meeting." }); }
    const admission = {
      meeting: meeting.payload, session, links: links.map(row => row.payload), userId: user.id,
      isSuperAdmin: snapshot.is_super_admin === true,
      permissions: snapshot.effective_permissions ?? [],
    };
    const decision = checkOnlineAdmission(admission);
    if (!decision.allowed) return response(req, decision.status, { error: decision.error });
    if (!persistence.allowed && !await scopedAttendanceReady(attendanceScope, canonicalMeetingId, user.id)) {
      return response(req, 409, { error: "Company live attendance is not yet available." });
    }
    const canPublishMedia = canPublishOnlineMeeting(admission);

    const url = Deno.env.get("LIVEKIT_URL");
    const key = Deno.env.get("LIVEKIT_API_KEY");
    const secret = Deno.env.get("LIVEKIT_API_SECRET");
    if (!url || !/^wss:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(url) || !key || !secret) {
      return response(req, 503, { error: "Online meeting service is not yet configured." });
    }
    // A recovered meeting must never reuse its ended LiveKit room. An ended
    // participant's old provider token must not grant access to this new session.
    if (session.reopen_started_at && (!session.id || !/^SES-[A-Za-z0-9_-]+-R[0-9]+$/.test(session.id))) {
      return response(req, 409, { error: "Recovered meeting session identity is invalid." });
    }
    const room = await opaqueId("room", resolveLiveKitRoomIdentity(meeting, session, canonicalMeetingId));
    const roomService = new RoomServiceClient(url.replace(/^wss:/i, "https:"), key, secret);
    let liveRoom = (await roomService.listRooms([room])).find(item => item.name === room) ?? null;
    if (!liveRoom) {
      try {
        liveRoom = await roomService.createRoom({
          name: room,
          emptyTimeout: EMPTY_ROOM_TIMEOUT_SECONDS,
          maxParticipants: MAX_LIVEKIT_PARTICIPANTS,
        });
      } catch (createError) {
        liveRoom = (await roomService.listRooms([room])).find(item => item.name === room) ?? null;
        if (!liveRoom) throw createError;
      }
    }
    const roomCapacity = checkOnlineRoomCapacity(liveRoom, MAX_LIVEKIT_PARTICIPANTS);
    if (!roomCapacity.allowed) return response(req, roomCapacity.status, { error: roomCapacity.error });

    const identity = await opaqueId("user", user.id);
    const token = new AccessToken(key, secret, {
      identity, name: profiles[0].display_name || "Convay participant", ttl: 300,
    });
    token.addGrant({
      roomJoin: true, room, canPublish: canPublishMedia, canSubscribe: true,
      canPublishData: false, roomAdmin: false, roomCreate: false, roomList: false,
    });
    const participantToken = await token.toJwt();
    return response(req, 200, { serverUrl: url, participantToken, room, sessionId: attendanceScope.sessionId, expiresIn: 300 });
  } catch (error) {
    // Never expose SQL details, JWTs or LiveKit configuration in responses.
    console.error("convay-livekit admission rejected", error instanceof Error ? error.message : "unknown");
    return response(req, 502, { error: "Unable to verify meeting access. Try again or contact the organizer." });
  }
});
