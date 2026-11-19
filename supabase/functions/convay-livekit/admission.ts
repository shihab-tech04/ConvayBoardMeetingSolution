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
  const mode = ctx.meeting.mode ?? ctx.meeting.meeting_mode;
  if (mode !== "Virtual" && mode !== "Hybrid") {
    return { allowed: false, status: 409, error: "This meeting has no online room." };
  }
  if (!ctx.isSuperAdmin && !ctx.permissions.includes("mtg_join")) {
    return { allowed: false, status: 403, error: "You do not have meeting-join permission." };
  }
  const state = String(ctx.meeting.approval_status ?? ctx.meeting.status ?? "").toLowerCase();
  if (["draft", "cancelled", "canceled", "rejected", "completed", "ended", "archived"].includes(state)) {
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
