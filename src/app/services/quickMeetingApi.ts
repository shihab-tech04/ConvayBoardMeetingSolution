import { CONVAY_SUPABASE_PUBLISHABLE_KEY, CONVAY_SUPABASE_URL, convayAuth } from "./supabase/convayAuth";

type Json = Record<string, unknown>;

export interface QuickMeetingCreated {
  meetingId: string;
  title: string;
  expiresAt: string;
  shareToken: string;
  capacity: number;
}

export interface QuickMeetingState {
  meetingId: string;
  title: string;
  status: "active" | "ended";
  createdAt: string;
  expiresAt: string;
  admissionLocked: boolean;
  capacity: number;
  onlineCount: number;
  shareLink: { available: boolean; expiresAt: string } | null;
  participants: Array<{
    identity: string;
    name: string;
    participantKind: "host" | "guest";
    firstJoinedAt: string;
    lastJoinedAt: string;
    leftAt: string | null;
    joinCount: number;
    online: boolean;
  }>;
}

export interface QuickRoomAdmission {
  serverUrl: string;
  participantToken: string;
  expiresIn: number;
  identity?: string;
}

async function parseResponse(response: Response): Promise<Json> {
  const body = await response.json().catch(() => ({})) as Json;
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : `Quick Meeting request failed (${response.status}).`;
    throw new Error(message);
  }
  return body;
}

async function hostCall<T>(action: string, payload: Json = {}): Promise<T> {
  const response = await convayAuth.authenticatedRequest("/functions/v1/convay-quick-meeting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  return await parseResponse(response) as T;
}

async function guestCall<T>(action: string, payload: Json): Promise<T> {
  const response = await fetch(`${CONVAY_SUPABASE_URL}/functions/v1/convay-quick-meeting`, {
    method: "POST",
    headers: {
      apikey: CONVAY_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  return await parseResponse(response) as T;
}

export const quickMeetingApi = {
  create(title?: string) {
    return hostCall<QuickMeetingCreated>("create", title ? { title } : {});
  },
  state(meetingId: string) {
    return hostCall<QuickMeetingState>("state", { meetingId });
  },
  hostJoin(meetingId: string) {
    return hostCall<QuickRoomAdmission>("host-join", { meetingId });
  },
  confirmHostJoin(meetingId: string) {
    return hostCall<{ confirmed: boolean }>("confirm-host-join", { meetingId });
  },
  hostLeave(meetingId: string) {
    return hostCall<{ left: boolean }>("host-leave", { meetingId });
  },
  setAdmissionLocked(meetingId: string, locked: boolean) {
    return hostCall<{ admissionLocked: boolean }>(locked ? "lock-admission" : "unlock-admission", { meetingId });
  },
  rotateLink(meetingId: string) {
    return hostCall<{ shareToken: string; expiresAt: string; guestCleanupConfirmed: boolean }>("rotate-link", { meetingId });
  },
  revokeLink(meetingId: string) {
    return hostCall<{ revoked: boolean; guestCleanupConfirmed: boolean }>("revoke-link", { meetingId });
  },
  removeGuest(meetingId: string, identity: string) {
    return hostCall<{ removed: boolean }>("remove-guest", { meetingId, identity });
  },
  end(meetingId: string) {
    return hostCall<{ ended: boolean; cleanupConfirmed: boolean }>("end", { meetingId });
  },
  inspectGuest(shareToken: string, clientSessionId: string) {
    return guestCall<{ title: string; expiresAt: string; capacity: number; onlineCount: number }>("guest-inspect", { shareToken, clientSessionId });
  },
  guestJoin(shareToken: string, clientSessionId: string, displayName: string) {
    return guestCall<QuickRoomAdmission>("guest-join", { shareToken, clientSessionId, displayName });
  },
  confirmGuestJoin(shareToken: string, clientSessionId: string, displayName: string) {
    return guestCall<{ confirmed: boolean }>("confirm-guest-join", { shareToken, clientSessionId, displayName });
  },
  guestLeave(shareToken: string, clientSessionId: string, displayName: string) {
    return guestCall<{ left: boolean }>("guest-leave", { shareToken, clientSessionId, displayName });
  },
};

export function quickGuestShareUrl(shareToken: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return new URL(`${base}quick-meeting/${shareToken}`, window.location.origin).toString();
}
