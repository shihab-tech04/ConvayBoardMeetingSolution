import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { RoomServiceClient } from "npm:livekit-server-sdk@2.19.2";
import { checkOnlineAdmission, type OnlineMeeting, type OnlineLink, type OnlineSession } from "./admission.ts";

/**
 * Authenticated regular-meeting attendance gateway.
 * Only this server can translate verified LiveKit presence into an SQL command.
 * Browser requests NEVER select the actor or pass a service-role credential.
 */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set([
  "https://shihab-tech04.github.io", "http://localhost:5173", "http://127.0.0.1:5173",
]);
const identityRegex = /^[A-Za-z0-9_-]{1,180}$/;
const requestRegex = /^[A-Za-z0-9_-]{16,120}$/;
const statuses = new Set(["Present", "Left", "Temporarily Away", "Excused", "Recused"]);
function headers(req: Request): Headers {
  const out = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" });
  const origin = req.headers.get("Origin");
  if (origin && allowedOrigins.has(origin)) out.set("Access-Control-Allow-Origin", origin);
  out.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  out.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return out;
}
function reply(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}
async function authorizedFetch<T>(path: string, jwt: string, init?: RequestInit): Promise<T> {
  const res = await fetch(SUPABASE_URL + path, {
    ...init,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + jwt,
      "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Authorized account or registry read rejected (" + res.status + ").");
  return await res.json() as T;
}
type Row<T> = { payload: T };
async function entityRows<T>(entity: string, meetingId: string, jwt: string): Promise<T[]> {
  const params = new URLSearchParams({
    select: "payload", entity_key: "eq." + entity,
    "payload->>meeting_id": "eq." + meetingId, limit: "1000",
  });
  const records = await authorizedFetch<Row<T>[]>(
    "/rest/v1/convay_entity_records?" + params.toString(), jwt);
  return records.map(record => record.payload);
}
async function savedMeeting(meetingId: string, jwt: string): Promise<OnlineMeeting | null> {
  const key = new URLSearchParams({
    select: "payload", entity_key: "eq.bms.meetings",
    record_id: "eq." + meetingId, limit: "1",
  });
  const direct = await authorizedFetch<Row<OnlineMeeting>[]>(
    "/rest/v1/convay_entity_records?" + key.toString(), jwt);
  const match = direct[0]?.payload;
  if (match && (match.meeting_id === meetingId || match.id === meetingId)) return match;
  const fromBusinessId = await entityRows<OnlineMeeting>("bms.meetings", meetingId, jwt);
  return fromBusinessId.find(item => item.meeting_id === meetingId) ?? null;
}
async function opaqueId(kind: string, value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode("convay-livekit-v1:" + kind + ":" + value));
  return "cv-" + kind + "-" + Array.from(new Uint8Array(digest))
    .map(n => n.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
async function confirmedInLiveKit(meeting: OnlineMeeting, meetingId: string, participantId: string): Promise<boolean> {
  const url = Deno.env.get("LIVEKIT_URL") ?? "";
  const key = Deno.env.get("LIVEKIT_API_KEY") ?? "";
  const secret = Deno.env.get("LIVEKIT_API_SECRET") ?? "";
  if (!/^wss:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(url) || !key || !secret) {
    throw new Error("Online meeting provider is not configured.");
  }
  // Identical room and identity derivation to convay-livekit issuer v4.
  const room = await opaqueId("room", meeting.id ?? meetingId);
  const identity = await opaqueId("user", participantId);
  const liveKit = new RoomServiceClient(url.replace(/^wss:/i, "https:"), key, secret);
  const members = await liveKit.listParticipants(room);
  return members.some(member => member.identity === identity);
}
async function serviceRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!SERVICE_KEY) throw new Error("Attendance persistence is not configured.");
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + name, {
    method: "POST", cache: "no-store",
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { code?: string };
    if (body.code === "40001" || body.code === "23505")
      throw new Error("Attendance changed. Refresh and retry.");
    if (body.code === "42501") throw new Error("Meeting attendance permission denied.");
    if (body.code === "23514" || body.code === "23503")
      throw new Error("Meeting attendance cannot be changed in its current state.");
    throw new Error("Server could not confirm attendance.");
  }
  return await res.json() as T;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "Method not allowed." });
  const bearer = req.headers.get("Authorization") ?? "";
  if (!bearer.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return reply(req, 401, { error: "A valid Convay sign-in is required." });
  }
  let request: {
    action?: unknown; meetingId?: unknown; participantId?: unknown;
    nextStatus?: unknown; expectedRevision?: unknown; requestId?: unknown;
    attendanceMode?: unknown;
  };
  try { request = await req.json(); }
  catch { return reply(req, 400, { error: "Invalid attendance request." }); }
  const { action, meetingId, participantId, nextStatus, expectedRevision, requestId, attendanceMode } = request;
  if ((action !== "readback" && action !== "commit")
    || typeof meetingId !== "string" || !identityRegex.test(meetingId)
    || typeof participantId !== "string" || !identityRegex.test(participantId)
    || (action === "commit" && (
      typeof nextStatus !== "string" || !statuses.has(nextStatus)
      || typeof requestId !== "string" || !requestRegex.test(requestId)
      || typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0 || !["Online", "In-Person"].includes(String(attendanceMode))
    ))) {
    return reply(req, 400, { error: "Invalid attendance request." });
  }

  try {
    const jwt = bearer.slice("Bearer ".length).trim();
    const user = await authorizedFetch<{ id?: string }>("/auth/v1/user", jwt);
    if (!user.id) return reply(req, 401, { error: "Sign in to Convay." });
    const profileParams = new URLSearchParams({
      select: "user_id,account_status", user_id: "eq." + user.id, limit: "1",
    });
    const profile = await authorizedFetch<Array<{ account_status: string }>>(
      "/rest/v1/user_profiles?" + profileParams.toString(), jwt);
    if (profile.length !== 1 || profile[0].account_status !== "active") {
      return reply(req, 403, { error: "Your Convay account is not active." });
    }
    const access = await authorizedFetch<{ is_super_admin?: boolean; effective_permissions?: string[] }>(
      "/functions/v1/convay-access", jwt,
      { method: "POST", body: JSON.stringify({ action: "snapshot" }) });
    const permissions = access.effective_permissions ?? [];
    if (!access.is_super_admin && !permissions.includes("mtg_view")) {
      return reply(req, 403, { error: "You cannot view this meeting." });
    }
    const meeting = await savedMeeting(meetingId, jwt);
    if (!meeting) return reply(req, 404, { error: "Saved meeting unavailable." });
    const canonicalMeetingId = meeting.meeting_id ?? meeting.id ?? meetingId;
    const [links, sessions] = await Promise.all([
      entityRows<OnlineLink>("bms.meetingParticipantLinks", canonicalMeetingId, jwt),
      entityRows<OnlineSession>("bms.liveSessions", canonicalMeetingId, jwt),
    ]);
    const matching = links.filter(link =>
      link.meeting_id === canonicalMeetingId && link.user_id === participantId);
    if (matching.length !== 1) {
      return reply(req, 403, { error: "Participant is not registered in this meeting." });
    }
    const actorIsSelf = participantId === user.id;
    const hasAttendancePermission = access.is_super_admin === true
      || permissions.includes("mtg_attendance");
    if (!actorIsSelf && !hasAttendancePermission) {
      return reply(req, 403, { error: "Attendance management permission required." });
    }
    if (actorIsSelf && !hasAttendancePermission
      && !permissions.includes("mtg_join")) {
      return reply(req, 403, { error: "Meeting join permission required." });
    }
    const session = sessions.find(s => s.session_status === "active" || s.session_status === "paused")
      ?? sessions[0] ?? null;
    if (!session || !["active", "paused"].includes(session.session_status ?? "")) {
      return reply(req, 409, { error: "This meeting is not in an active session." });
    }
    const serverMode = meeting.meeting_mode ?? meeting.mode;
    const onlineMode = serverMode === "Hybrid" || serverMode === "Virtual";
    if (onlineMode && actorIsSelf && (action === "commit" && attendanceMode === "Online")) {
      const decision = checkOnlineAdmission({
        meeting, session, links, userId: user.id,
        isSuperAdmin: access.is_super_admin === true,
        permissions,
      });
      if (!decision.allowed) {
        return reply(req, decision.status, { error: decision.error });
      }
    }
    if (action === "readback") {
      const result = await serviceRpc<Record<string, unknown>>("convay_read_live_attendance", {
        p_actor_id: user.id, p_meeting_id: canonicalMeetingId, p_participant_id: participantId,
      });
      return reply(req, 200, result);
    }

    let providerVerified = false;
    if (attendanceMode === "Online" && nextStatus === "Present") {
      providerVerified = await confirmedInLiveKit(meeting, meetingId, participantId);
      if (!providerVerified) {
        return reply(req, 409, { error: "Connect to the LiveKit room before recording attendance." });
      }
    }
    const result = await serviceRpc<Record<string, unknown>>("convay_commit_live_attendance", {
      p_actor_id: user.id, p_meeting_id: canonicalMeetingId, p_participant_id: participantId,
      p_next_status: nextStatus, p_expected_revision: expectedRevision,
      p_request_id: requestId, p_provider_confirmed: providerVerified,
      p_attendance_mode: attendanceMode,
    });
    return reply(req, 200, result);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unable to confirm attendance.";
    const status = /permission|denied|cannot view/i.test(message) ? 403
      : /changed|current state|not in an active session|Connect to/i.test(message) ? 409 : 502;
    console.error("convay-attendance request rejected", message);
    return reply(req, status, { error: message });
  }
});
