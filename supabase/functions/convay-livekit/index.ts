import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.19.2";
import { checkOnlineAdmission, type OnlineMeeting, type OnlineLink, type OnlineSession } from "./admission.ts";

/**
 * Server-side LiveKit admission. The browser never holds an API secret.
 * JWT validation is deliberately repeated here even when the Edge gateway
 * verifies the Authorization header, to tie the token to an active user.
 */
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
type RecordRow<T> = { payload: T };
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
async function entityRows<T>(entity: string, meetingId: string, jwt: string): Promise<T[]> {
  const query = new URLSearchParams({
    select: "payload",
    entity_key: "eq." + entity,
    "payload->>meeting_id": "eq." + meetingId,
    limit: "1000",
  });
  return (await jsonRequest<RecordRow<T>[]>(
    "/rest/v1/convay_entity_records?" + query.toString(), jwt
  )).map(row => row.payload);
}
async function savedMeeting(meetingId: string, jwt: string): Promise<OnlineMeeting | null> {
  // Check the canonical record ID, then a meeting_id field for older records.
  const direct = new URLSearchParams({
    select: "payload", entity_key: "eq.bms.meetings",
    record_id: "eq." + meetingId, limit: "1",
  });
  const rows = await jsonRequest<RecordRow<OnlineMeeting>[]>(
    "/rest/v1/convay_entity_records?" + direct.toString(), jwt
  );
  const meeting = rows[0]?.payload;
  if (meeting && (meeting.meeting_id === meetingId || meeting.id === meetingId)) return meeting;
  const byBusinessId = await entityRows<OnlineMeeting>("bms.meetings", meetingId, jwt);
  return byBusinessId.find(item => item.meeting_id === meetingId) ?? null;
}
async function opaqueId(kind: string, value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("convay-livekit-v1:" + kind + ":" + value));
  return "cv-" + kind + "-" + Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return response(req, 405, { error: "Method not allowed." });
  const bearer = req.headers.get("Authorization") ?? "";
  if (!bearer.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_KEY) {
    return response(req, 401, { error: "A valid Convay sign-in is required." });
  }
  const jwt = bearer.slice("Bearer ".length).trim();
  let body: { meetingId?: unknown };
  try { body = await req.json(); }
  catch { return response(req, 400, { error: "Invalid request." }); }
  const meetingId = body?.meetingId;
  if (typeof meetingId !== "string" || !/^[A-Za-z0-9_-]{1,180}$/.test(meetingId)) {
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
    const [links, sessions] = await Promise.all([
      entityRows<OnlineLink>("bms.meetingParticipantLinks", meetingId, jwt),
      entityRows<OnlineSession>("bms.liveSessions", meetingId, jwt),
    ]);
    const session = sessions.find(item => item.session_status === "active" || item.session_status === "paused")
      ?? sessions[0] ?? null;
    const decision = checkOnlineAdmission({
      meeting, session, links, userId: user.id,
      isSuperAdmin: snapshot.is_super_admin === true,
      permissions: snapshot.effective_permissions ?? [],
    });
    if (!decision.allowed) return response(req, decision.status, { error: decision.error });

    const url = Deno.env.get("LIVEKIT_URL");
    const key = Deno.env.get("LIVEKIT_API_KEY");
    const secret = Deno.env.get("LIVEKIT_API_SECRET");
    if (!url || !/^wss:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(url) || !key || !secret) {
      return response(req, 503, { error: "Online meeting service is not yet configured." });
    }
    const room = await opaqueId("room", meeting.id ?? meetingId);
    const identity = await opaqueId("user", user.id);
    const token = new AccessToken(key, secret, {
      identity, name: profiles[0].display_name || "Convay participant", ttl: 300,
    });
    token.addGrant({
      roomJoin: true, room, canPublish: true, canSubscribe: true,
      canPublishData: false, roomAdmin: false, roomCreate: false, roomList: false,
    });
    const participantToken = await token.toJwt();
    return response(req, 200, { serverUrl: url, participantToken, room, expiresIn: 300 });
  } catch (error) {
    // Never expose SQL details, JWTs or LiveKit configuration in responses.
    console.error("convay-livekit admission rejected", error instanceof Error ? error.message : "unknown");
    return response(req, 502, { error: "Unable to verify meeting access. Try again or contact the organizer." });
  }
});
