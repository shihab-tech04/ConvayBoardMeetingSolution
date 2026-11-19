import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AccessToken, RoomServiceClient } from "npm:livekit-server-sdk@2.19.2";
import {
  canCreateQuickMeeting,
  checkQuickGuestAdmission,
  checkQuickMeetingLink,
  isQuickMeetingSessionId,
  normalizeQuickParticipantName,
  type QuickMeetingAccessRecord,
  type QuickMeetingLinkAccessRecord,
} from "./quickMeetingRules.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_BODY_BYTES = 16_384;
const TOKEN_TTL_SECONDS = 120;
const MEETING_LIFETIME_MS = 4 * 60 * 60 * 1000;
const allowedOrigins = new Set([
  "https://shihab-tech04.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8443",
  "http://127.0.0.1:8443",
]);

type JsonObject = Record<string, unknown>;
type HostIdentity = {
  id: string;
  name: string;
  isSuperAdmin: boolean;
  permissions: string[];
};
type QuickMeetingRow = QuickMeetingAccessRecord & {
  id: string;
  title: string;
  room_name: string;
  created_at: string;
  ended_at: string | null;
};
type QuickLinkRow = QuickMeetingLinkAccessRecord & {
  id: string;
  meeting_id: string;
  token_hash: string;
  created_by: string;
};
type AttendanceRow = {
  meeting_id: string;
  livekit_identity: string;
  participant_kind: "host" | "guest";
  user_id: string | null;
  share_link_id: string | null;
  display_name: string;
  first_joined_at: string;
  last_joined_at: string;
  left_at: string | null;
  join_count: number;
};
type LiveParticipant = { identity: string; name?: string; joinedAt?: number | string };

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function responseHeaders(req: Request): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
  });
  const origin = req.headers.get("Origin");
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return headers;
}

function respond(req: Request, status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(req) });
}

async function bodyOf(req: Request): Promise<JsonObject> {
  const length = Number(req.headers.get("Content-Length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new HttpError(413, "Request is too large.");
  let raw: string;
  try { raw = await req.text(); }
  catch { throw new HttpError(400, "Invalid request."); }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new HttpError(413, "Request is too large.");
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("object required");
    return value as JsonObject;
  } catch { throw new HttpError(400, "Invalid request."); }
}

function requireConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    throw new HttpError(503, "Quick meetings are not configured yet.");
  }
}

function serviceHeaders(extra?: HeadersInit): Headers {
  return new Headers({
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...Object.fromEntries(new Headers(extra).entries()),
  });
}

async function serviceJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: serviceHeaders(init.headers),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(502, "Quick meeting storage could not confirm the request.");
  if (!text) return undefined as T;
  try { return JSON.parse(text) as T; }
  catch { throw new HttpError(502, "Quick meeting storage returned an invalid response."); }
}

async function authenticatedJson<T>(path: string, jwt: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new HttpError(res.status === 401 ? 401 : 502, "Convay sign-in could not be verified.");
  return await res.json() as T;
}

function accessToken(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Sign in to Convay to manage this quick meeting.");
  return match[1].trim();
}

async function requireHostUser(req: Request): Promise<HostIdentity> {
  requireConfig();
  const jwt = accessToken(req);
  const user = await authenticatedJson<{
    id?: string;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
  }>("/auth/v1/user", jwt);
  if (!user.id || !(user.email_confirmed_at || user.confirmed_at)) {
    throw new HttpError(403, "Verify your Convay email before hosting a quick meeting.");
  }
  const profileParams = new URLSearchParams({
    select: "display_name,account_status",
    user_id: `eq.${user.id}`,
    limit: "1",
  });
  const profiles = await serviceJson<Array<{ display_name: string; account_status: string }>>(
    `/rest/v1/user_profiles?${profileParams}`,
  );
  if (profiles[0]?.account_status !== "active") throw new HttpError(403, "Your Convay account is not active.");
  const snapshot = await authenticatedJson<{
    is_super_admin?: boolean;
    effective_permissions?: string[];
  }>("/functions/v1/convay-access", jwt, { method: "POST", body: JSON.stringify({ action: "snapshot" }) });
  return {
    id: user.id,
    name: profiles[0].display_name,
    isSuperAdmin: snapshot.is_super_admin === true,
    permissions: Array.isArray(snapshot.effective_permissions) ? snapshot.effective_permissions : [],
  };
}

function roomService(): RoomServiceClient {
  const url = Deno.env.get("LIVEKIT_URL") ?? "";
  const key = Deno.env.get("LIVEKIT_API_KEY") ?? "";
  const secret = Deno.env.get("LIVEKIT_API_SECRET") ?? "";
  if (!/^wss:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(url) || !key || !secret) {
    throw new HttpError(503, "Online meeting service is not configured yet.");
  }
  return new RoomServiceClient(url.replace(/^wss:/i, "https:"), key, secret);
}

function livekitServerUrl(): string {
  const url = Deno.env.get("LIVEKIT_URL") ?? "";
  if (!url) throw new HttpError(503, "Online meeting service is not configured yet.");
  return url;
}

async function opaque(kind: string, raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`convay-quick-${kind}-v1:${raw}`));
  const hex = Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, "0")).join("");
  return `${kind === "host" ? "qh" : "qg"}-${hex.slice(0, 48)}`;
}

async function newShareSecret(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, "0")).join("");
}

function cleanMeetingId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, "A valid quick meeting ID is required.");
  }
  return value;
}

function cleanShareSecret(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new HttpError(404, "This quick meeting link is unavailable.");
  }
  return value;
}

function cleanSessionId(value: unknown): string {
  if (!isQuickMeetingSessionId(value)) throw new HttpError(400, "Refresh the page and try joining again.");
  return value;
}

async function meetingById(id: string): Promise<QuickMeetingRow | null> {
  const query = new URLSearchParams({
    select: "id,owner_id,title,meeting_kind,access_mode,status,room_name,admission_locked,max_participants,created_at,expires_at,ended_at",
    id: `eq.${id}`,
    limit: "1",
  });
  return (await serviceJson<QuickMeetingRow[]>(`/rest/v1/convay_quick_meetings?${query}`))[0] ?? null;
}

async function ownedMeeting(id: string, host: HostIdentity): Promise<QuickMeetingRow> {
  const meeting = await meetingById(id);
  if (!meeting || meeting.owner_id !== host.id || meeting.meeting_kind !== "quick" || meeting.access_mode !== "link") {
    throw new HttpError(404, "This quick meeting is not available to your account.");
  }
  return meeting;
}

async function linkBySecret(secret: string): Promise<QuickLinkRow | null> {
  const tokenHash = await sha256Hex(secret);
  const query = new URLSearchParams({
    select: "id,meeting_id,token_hash,created_by,expires_at,revoked_at",
    token_hash: `eq.${tokenHash}`,
    limit: "1",
  });
  return (await serviceJson<QuickLinkRow[]>(`/rest/v1/convay_quick_meeting_links?${query}`))[0] ?? null;
}

async function requireGuestLink(secret: string): Promise<{ meeting: QuickMeetingRow; link: QuickLinkRow }> {
  const link = await linkBySecret(secret);
  if (!link) throw new HttpError(404, "This quick meeting link is unavailable.");
  const meeting = await meetingById(link.meeting_id);
  if (!meeting) throw new HttpError(404, "This quick meeting link is unavailable.");
  const decision = checkQuickMeetingLink(meeting, link);
  if (!decision.allowed) throw new HttpError(decision.status, decision.error);
  return { meeting, link };
}

async function allRoomParticipants(meeting: QuickMeetingRow): Promise<LiveParticipant[]> {
  try {
    const service = roomService();
    const rooms = await service.listRooms([meeting.room_name]);
    if (!rooms.some(room => room.name === meeting.room_name)) return [];
    return await service.listParticipants(meeting.room_name) as unknown as LiveParticipant[];
  } catch {
    throw new HttpError(503, "The quick meeting room is unavailable. Try again shortly.");
  }
}

async function ensureLiveRoom(meeting: QuickMeetingRow) {
  if (meeting.status !== "active" || Date.parse(meeting.expires_at) <= Date.now()) {
    throw new HttpError(410, "This quick meeting has ended or expired.");
  }
  const service = roomService();
  if ((await service.listRooms([meeting.room_name])).some(room => room.name === meeting.room_name)) return;
  try {
    await service.createRoom({ name: meeting.room_name, emptyTimeout: 600, maxParticipants: meeting.max_participants });
  } catch (cause) {
    if (!(await service.listRooms([meeting.room_name])).some(room => room.name === meeting.room_name)) throw cause;
  }
}

async function closeLiveRoom(roomName: string): Promise<boolean> {
  const service = roomService();
  try { await service.deleteRoom(roomName); } catch { /* Verify state below; the room may already be gone. */ }
  try {
    if (!(await service.listRooms([roomName])).some(room => room.name === roomName)) return true;
    const participants = await service.listParticipants(roomName) as unknown as LiveParticipant[];
    for (const participant of participants) {
      try { await service.removeParticipant(roomName, participant.identity); } catch { /* Verify remaining presence below. */ }
    }
    return (await service.listParticipants(roomName)).length === 0;
  } catch {
    return false;
  }
}

function issueRoomToken(identity: string, name: string, room: string): Promise<string> {
  const key = Deno.env.get("LIVEKIT_API_KEY") ?? "";
  const secret = Deno.env.get("LIVEKIT_API_SECRET") ?? "";
  const token = new AccessToken(key, secret, { identity, name, ttl: TOKEN_TTL_SECONDS });
  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    roomAdmin: false,
    roomCreate: false,
    roomList: false,
  });
  return token.toJwt();
}

async function hasRoomIdentity(participants: LiveParticipant[], identity: string): Promise<boolean> {
  return participants.some(participant => participant.identity === identity);
}

async function postRpc<T>(name: string, args: JsonObject): Promise<T> {
  return await serviceJson<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

async function recordJoin(
  meeting: QuickMeetingRow,
  identity: string,
  kind: "host" | "guest",
  userId: string | null,
  name: string,
  shareLinkId: string | null,
) {
  return await postRpc<AttendanceRow>("convay_record_quick_attendance", {
    p_meeting_id: meeting.id,
    p_livekit_identity: identity,
    p_participant_kind: kind,
    p_user_id: userId,
    p_display_name: name,
    p_share_link_id: shareLinkId,
  });
}

async function isReturningGuest(meetingId: string, identity: string, linkId: string): Promise<boolean> {
  const query = new URLSearchParams({
    select: "participant_kind,share_link_id",
    meeting_id: `eq.${meetingId}`,
    livekit_identity: `eq.${identity}`,
    limit: "1",
  });
  const rows = await serviceJson<Array<{ participant_kind: string; share_link_id: string | null }>>(
    `/rest/v1/convay_quick_meeting_attendance?${query}`,
  );
  return rows[0]?.participant_kind === "guest" && rows[0]?.share_link_id === linkId;
}

async function markLeftAfterPresenceCheck(meeting: QuickMeetingRow, identity: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const present = await allRoomParticipants(meeting);
    if (!(await hasRoomIdentity(present, identity))) {
      await postRpc("convay_mark_quick_attendance_left", {
        p_meeting_id: meeting.id,
        p_livekit_identity: identity,
      });
      return;
    }
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new HttpError(409, "Convay still sees this participant in the room. Try leaving again after disconnecting.");
}

async function removeGuestsForRevokedLink(meeting: QuickMeetingRow): Promise<boolean> {
  let participants: LiveParticipant[];
  try { participants = await allRoomParticipants(meeting); }
  catch { return false; }
  const guests = participants.filter(participant => participant.identity.startsWith("qg-"));
  const service = roomService();
  let confirmed = true;
  for (const participant of guests) {
    try { await service.removeParticipant(meeting.room_name, participant.identity); }
    catch { /* Room may have already disconnected this participant. */ }
    try { await markLeftAfterPresenceCheck(meeting, participant.identity); }
    catch { confirmed = false; }
  }
  try {
    const remaining = await allRoomParticipants(meeting);
    if (remaining.some(participant => participant.identity.startsWith("qg-"))) confirmed = false;
  } catch { confirmed = false; }
  return confirmed;
}

async function hostAction(req: Request, body: JsonObject): Promise<JsonObject> {
  const host = await requireHostUser(req);
  const action = body.action;

  if (action === "create") {
    if (!canCreateQuickMeeting(host.isSuperAdmin, host.permissions)) {
      throw new HttpError(403, "You need Quick Meeting creation permission.");
    }
    const requestedTitle = normalizeQuickParticipantName(body.title);
    const title = requestedTitle ?? "Quick Meeting";
    if (typeof body.title === "string" && body.title.trim() && !requestedTitle) {
      throw new HttpError(400, "Meeting title must contain 2-80 characters.");
    }
    const expiresAt = new Date(Date.now() + MEETING_LIFETIME_MS).toISOString();
    const roomName = `qmr-${crypto.randomUUID()}`;
    const secret = await newShareSecret();
    const tokenHash = await sha256Hex(secret);
    let roomCreated = false;
    try {
      await roomService().createRoom({ name: roomName, emptyTimeout: 600, maxParticipants: 4 });
      roomCreated = true;
      const meetingId = await postRpc<string>("convay_create_quick_meeting", {
        p_owner_id: host.id,
        p_room_name: roomName,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
        p_max_participants: 4,
        p_title: title,
      });
      if (typeof meetingId !== "string") throw new HttpError(502, "Quick Meeting could not be saved.");
      return { meetingId, title, expiresAt, shareToken: secret, capacity: 4 };
    } catch (error) {
      if (roomCreated) { try { await roomService().deleteRoom(roomName); } catch { /* cleanup is best effort */ } }
      throw error;
    }
  }

  const meetingId = cleanMeetingId(body.meetingId);
  const meeting = await ownedMeeting(meetingId, host);
  if (action === "state") {
    if (meeting.status === "ended") {
      const query = new URLSearchParams({
        select: "livekit_identity,participant_kind,display_name,first_joined_at,last_joined_at,left_at,join_count",
        meeting_id: `eq.${meetingId}`,
        order: "first_joined_at.asc",
      });
      const [rows, participants] = await Promise.all([
        serviceJson<AttendanceRow[]>(`/rest/v1/convay_quick_meeting_attendance?${query}`),
        allRoomParticipants(meeting),
      ]);
      const onlineIds = new Set(participants.map(item => item.identity));
      for (const row of rows) {
        if (row.left_at === null && !onlineIds.has(row.livekit_identity)) {
          await postRpc("convay_mark_quick_attendance_left", {
            p_meeting_id: meetingId,
            p_livekit_identity: row.livekit_identity,
          });
        }
      }
      return {
        meetingId,
        title: meeting.title,
        status: meeting.status,
        createdAt: meeting.created_at,
        expiresAt: meeting.expires_at,
        admissionLocked: true,
        capacity: meeting.max_participants,
        participants: rows.map(row => ({
          identity: row.livekit_identity,
          name: row.display_name,
          participantKind: row.participant_kind,
          firstJoinedAt: row.first_joined_at,
          lastJoinedAt: row.last_joined_at,
          leftAt: onlineIds.has(row.livekit_identity) ? null : row.left_at ?? new Date().toISOString(),
          joinCount: row.join_count,
          online: onlineIds.has(row.livekit_identity),
        })),
        shareLink: null,
        onlineCount: participants.length,
      };
    }
    const [rows, participants, links] = await Promise.all([
      (async () => {
        const query = new URLSearchParams({
          select: "livekit_identity,participant_kind,display_name,first_joined_at,last_joined_at,left_at,join_count,share_link_id",
          meeting_id: `eq.${meetingId}`,
          order: "first_joined_at.asc",
        });
        return await serviceJson<AttendanceRow[]>(`/rest/v1/convay_quick_meeting_attendance?${query}`);
      })(),
      allRoomParticipants(meeting),
      (async () => {
        const query = new URLSearchParams({
          select: "id,expires_at,revoked_at",
          meeting_id: `eq.${meetingId}`,
          revoked_at: "is.null",
          order: "created_at.desc",
          limit: "1",
        });
        return await serviceJson<Array<{ id: string; expires_at: string; revoked_at: null }>>(
          `/rest/v1/convay_quick_meeting_links?${query}`,
        );
      })(),
    ]);
    const onlineIds = new Set(participants.map(item => item.identity));
    const seen = new Set<string>();
    const leftAtByIdentity = new Map<string, string | null>();
    for (const row of rows) {
      seen.add(row.livekit_identity);
      if (row.left_at === null && !onlineIds.has(row.livekit_identity)) {
        await postRpc("convay_mark_quick_attendance_left", {
          p_meeting_id: meetingId,
          p_livekit_identity: row.livekit_identity,
        });
        leftAtByIdentity.set(row.livekit_identity, new Date().toISOString());
      } else {
        leftAtByIdentity.set(row.livekit_identity, row.left_at);
      }
    }
    const roster = [
      ...rows.map(row => ({
        identity: row.livekit_identity,
        name: row.display_name,
        participantKind: row.participant_kind,
        firstJoinedAt: row.first_joined_at,
        lastJoinedAt: row.last_joined_at,
        leftAt: onlineIds.has(row.livekit_identity) ? null : leftAtByIdentity.get(row.livekit_identity) ?? row.left_at,
        joinCount: row.join_count,
        online: onlineIds.has(row.livekit_identity),
      })),
      ...participants.filter(item => !seen.has(item.identity)).map(item => ({
        identity: item.identity,
        name: item.name || "Joining participant",
        participantKind: item.identity.startsWith("qh-") ? "host" : "guest",
        firstJoinedAt: "",
        lastJoinedAt: "",
        leftAt: null,
        joinCount: 0,
        online: true,
      })),
    ];
    return {
      meetingId,
      title: meeting.title,
      status: meeting.status,
      createdAt: meeting.created_at,
      expiresAt: meeting.expires_at,
      admissionLocked: meeting.admission_locked,
      capacity: meeting.max_participants,
      participants: roster,
      shareLink: links[0] ? { available: Date.parse(links[0].expires_at) > Date.now(), expiresAt: links[0].expires_at } : null,
      onlineCount: participants.length,
    };
  }

  if (action === "host-join") {
    if (meeting.status !== "active" || Date.parse(meeting.expires_at) <= Date.now()) {
      throw new HttpError(410, "This quick meeting has ended or expired.");
    }
    await ensureLiveRoom(meeting);
    const identity = await opaque("host", `${meeting.id}:${host.id}`);
    const participants = await allRoomParticipants(meeting);
    if (!participants.some(item => item.identity === identity) && participants.length >= meeting.max_participants) {
      throw new HttpError(409, "This quick meeting is full.");
    }
    const participantToken = await issueRoomToken(identity, host.name, meeting.room_name);
    return { serverUrl: livekitServerUrl(), participantToken, expiresIn: TOKEN_TTL_SECONDS };
  }

  if (action === "confirm-host-join" || action === "host-leave") {
    const identity = await opaque("host", `${meeting.id}:${host.id}`);
    if (action === "confirm-host-join") {
      const participants = await allRoomParticipants(meeting);
      if (!(await hasRoomIdentity(participants, identity))) throw new HttpError(409, "LiveKit has not confirmed your connection yet.");
      await recordJoin(meeting, identity, "host", host.id, host.name, null);
      return { confirmed: true };
    }
    await markLeftAfterPresenceCheck(meeting, identity);
    return { left: true };
  }

  if (action === "lock-admission" || action === "unlock-admission") {
    if (meeting.status !== "active") throw new HttpError(410, "This quick meeting has ended.");
    await serviceJson(`/rest/v1/convay_quick_meetings?id=eq.${meetingId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ admission_locked: action === "lock-admission" }),
    });
    return { admissionLocked: action === "lock-admission" };
  }

  if (action === "rotate-link") {
    if (meeting.status !== "active" || Date.parse(meeting.expires_at) <= Date.now()) {
      throw new HttpError(410, "This quick meeting has ended or expired.");
    }
    const secret = await newShareSecret();
    await postRpc<string | null>("convay_rotate_quick_meeting_link", {
      p_meeting_id: meeting.id,
      p_owner_id: host.id,
      p_token_hash: await sha256Hex(secret),
    });
    const guestCleanupConfirmed = await removeGuestsForRevokedLink(meeting);
    return { shareToken: secret, expiresAt: meeting.expires_at, guestCleanupConfirmed };
  }

  if (action === "revoke-link") {
    await postRpc<string | null>("convay_revoke_quick_meeting_link", {
      p_meeting_id: meeting.id,
      p_owner_id: host.id,
    });
    const guestCleanupConfirmed = await removeGuestsForRevokedLink(meeting);
    return { revoked: true, guestCleanupConfirmed };
  }

  if (action === "remove-guest") {
    const identity = typeof body.identity === "string" && /^qg-[0-9a-f]{48}$/.test(body.identity) ? body.identity : "";
    if (!identity) throw new HttpError(400, "Choose a guest in this quick meeting.");
    const activeParticipants = await allRoomParticipants(meeting);
    const inRoom = activeParticipants.some(participant => participant.identity === identity);
    const query = new URLSearchParams({
      select: "participant_kind",
      meeting_id: `eq.${meetingId}`,
      livekit_identity: `eq.${identity}`,
      limit: "1",
    });
    const attendance = await serviceJson<Array<{ participant_kind: string }>>(`/rest/v1/convay_quick_meeting_attendance?${query}`);
    if (!inRoom && attendance[0]?.participant_kind !== "guest") throw new HttpError(404, "Guest is no longer in this quick meeting.");
    if (inRoom) {
      try { await roomService().removeParticipant(meeting.room_name, identity); } catch { /* It may have just disconnected. */ }
      await markLeftAfterPresenceCheck(meeting, identity);
    } else {
      await postRpc("convay_mark_quick_attendance_left", { p_meeting_id: meetingId, p_livekit_identity: identity });
    }
    return { removed: true };
  }

  if (action === "end") {
    const roomName = await postRpc<string>("convay_end_quick_meeting", {
      p_meeting_id: meeting.id,
      p_owner_id: host.id,
    });
    const cleanupConfirmed = await closeLiveRoom(roomName);
    if (cleanupConfirmed) {
      const query = new URLSearchParams({ meeting_id: `eq.${meeting.id}`, left_at: "is.null" });
      await serviceJson(`/rest/v1/convay_quick_meeting_attendance?${query}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ left_at: new Date().toISOString() }),
      });
    }
    return { ended: true, cleanupConfirmed };
  }

  throw new HttpError(400, "Unknown quick meeting action.");
}

async function guestAction(body: JsonObject): Promise<JsonObject> {
  requireConfig();
  const action = body.action;
  const secret = cleanShareSecret(body.shareToken);
  let meeting: QuickMeetingRow;
  let link: QuickLinkRow;
  if (action === "guest-leave") {
    const foundLink = await linkBySecret(secret);
    if (!foundLink) throw new HttpError(404, "This quick meeting link is unavailable.");
    const foundMeeting = await meetingById(foundLink.meeting_id);
    if (!foundMeeting) throw new HttpError(404, "This quick meeting link is unavailable.");
    meeting = foundMeeting;
    link = foundLink;
  } else {
    ({ meeting, link } = await requireGuestLink(secret));
  }

  if (action === "guest-inspect" || action === "guest-join") {
    const sessionId = cleanSessionId(body.clientSessionId);
    const identity = await opaque("guest", `${link.token_hash}:${sessionId}`);
    const participants = await allRoomParticipants(meeting);
    const identityAlreadyPresent = await hasRoomIdentity(participants, identity);
    const returningParticipant = await isReturningGuest(meeting.id, identity, link.id);
    const decision = checkQuickGuestAdmission({
      meeting,
      link,
      participantCount: participants.length,
      identityAlreadyPresent,
      returningParticipant,
    });
    if (!decision.allowed) throw new HttpError(decision.status, decision.error);
    if (action === "guest-inspect") {
      return { title: meeting.title, expiresAt: link.expires_at, capacity: meeting.max_participants, onlineCount: participants.length };
    }
    const name = normalizeQuickParticipantName(body.displayName);
    if (!name) throw new HttpError(400, "Enter a display name between 2 and 80 characters.");
    await ensureLiveRoom(meeting);
    const participantToken = await issueRoomToken(identity, name, meeting.room_name);
    return { serverUrl: livekitServerUrl(), participantToken, expiresIn: TOKEN_TTL_SECONDS, identity };
  }

  if (action === "confirm-guest-join" || action === "guest-leave") {
    const sessionId = cleanSessionId(body.clientSessionId);
    const identity = await opaque("guest", `${link.token_hash}:${sessionId}`);
    const name = normalizeQuickParticipantName(body.displayName);
    if (!name) throw new HttpError(400, "The guest display name is missing.");
    if (action === "confirm-guest-join") {
      const participants = await allRoomParticipants(meeting);
      if (!(await hasRoomIdentity(participants, identity))) throw new HttpError(409, "LiveKit has not confirmed your connection yet.");
      await recordJoin(meeting, identity, "guest", null, name, link.id);
      return { confirmed: true };
    }
    await markLeftAfterPresenceCheck(meeting, identity);
    return { left: true };
  }

  throw new HttpError(400, "Unknown quick meeting action.");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Method not allowed." });
  let action = "unknown";
  try {
    const body = await bodyOf(req);
    action = typeof body.action === "string" ? body.action : "unknown";
    const result = action.startsWith("guest-") || action === "confirm-guest-join"
      ? await guestAction(body)
      : await hostAction(req, body);
    return respond(req, 200, result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 502;
    const message = error instanceof HttpError
      ? error.message
      : "Convay could not complete this quick meeting request. Try again or contact the organizer.";
    console.error("convay quick meeting request failed", action, status);
    return respond(req, status, { error: message });
  }
});
