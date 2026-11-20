/**
 * Convay online admission rules. No browser input can grant membership or roles.
 * These functions are pure so rejection cases can be tested without credentials.
 */
export interface OnlineMeeting {
  id?: string;
  meeting_id?: string;
  mode?: string;
  meeting_mode?: string;
  approval_status?: string;
  status?: string;
  chairperson?: string;
  secretary?: string;
  organizer?: string;
  created_by?: string;
}
export interface OnlineLink {
  meeting_id?: string;
  user_id?: string;
}
export interface OnlineSession {
  meeting_id?: string;
  session_status?: string;
}
export interface AdmissionContext {
  meeting: OnlineMeeting;
  session?: OnlineSession | null;
  links: OnlineLink[];
  userId: string;
  isSuperAdmin: boolean;
  permissions: string[];
}
export type AdmissionDecision =
  | { allowed: true }
  | { allowed: false; status: number; error: string };

export function checkOnlineAdmission(ctx: AdmissionContext): AdmissionDecision {
  // Both mode aliases must be safe: a stale Virtual value must not
  // override a Physical meeting stored in the other field.
  const modes = [ctx.meeting.mode, ctx.meeting.meeting_mode]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "");
  if (!modes.length || modes.some(mode => mode !== "Virtual" && mode !== "Hybrid")) {
    return { allowed: false, status: 409, error: "This meeting has no online room." };
  }
  if (!ctx.isSuperAdmin && !ctx.permissions.includes("mtg_join")) {
    return { allowed: false, status: 403, error: "You do not have meeting-join permission." };
  }
  // Inspect both lifecycle aliases rather than trusting the first field.
  // Conflicting Draft/Cancelled/Ended values cannot authorize a room.
  const blockedStates = new Set(["draft", "cancelled", "canceled", "rejected", "completed", "ended", "archived"]);
  const states = [ctx.meeting.approval_status, ctx.meeting.status]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .map(value => value.trim().toLowerCase());
  if (!states.length || states.some(state => blockedStates.has(state))) {
    return { allowed: false, status: 409, error: "This meeting cannot be joined at its current status." };
  }
  // A URL or scheduled meeting is not proof that the organizer has started it.
  const sessionState = ctx.session?.session_status;
  if (sessionState !== "active" && sessionState !== "paused") {
    return { allowed: false, status: 409, error: "The online meeting has not started or has ended." };
  }
  const isMember = ctx.links.some(link =>
    link.meeting_id === (ctx.meeting.meeting_id ?? ctx.meeting.id)
    && link.user_id === ctx.userId
  );
  const isLeader = [ctx.meeting.created_by, ctx.meeting.chairperson, ctx.meeting.secretary, ctx.meeting.organizer]
    .some(id => !!id && id === ctx.userId);
  if (!ctx.isSuperAdmin && !isMember && !isLeader) {
    return { allowed: false, status: 403, error: "You are not an authorized participant in this meeting." };
  }
  return { allowed: true };
}

export interface OnlineRoomCapacity {
  maxParticipants?: number;
  numParticipants?: number;
}

export function checkOnlineRoomCapacity(
  room: OnlineRoomCapacity | null,
  expectedLimit = 4,
): AdmissionDecision {
  const participantCount = room?.numParticipants;
  if (
    !room
    || room.maxParticipants !== expectedLimit
    || typeof participantCount !== "number"
    || !Number.isInteger(participantCount)
    || participantCount < 0
  ) {
    return { allowed: false, status: 503, error: "The online meeting room is not configured for four participants." };
  }
  if (participantCount >= expectedLimit) {
    return { allowed: false, status: 409, error: "This online meeting has reached its four-participant limit." };
  }
  return { allowed: true };
}
