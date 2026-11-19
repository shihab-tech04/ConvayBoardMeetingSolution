export type QuickMeetingStatus = "active" | "ended";

export interface QuickMeetingAccessRecord {
  owner_id: string;
  meeting_kind: string;
  access_mode: string;
  status: QuickMeetingStatus;
  expires_at: string;
  admission_locked: boolean;
  max_participants: number;
}

export interface QuickMeetingLinkAccessRecord {
  expires_at: string;
  revoked_at: string | null;
}

export interface QuickMeetingAdmissionContext {
  meeting: QuickMeetingAccessRecord;
  link: QuickMeetingLinkAccessRecord;
  participantCount: number;
  identityAlreadyPresent: boolean;
  returningParticipant?: boolean;
  now?: number;
}

export type QuickMeetingAdmissionDecision =
  | { allowed: true }
  | { allowed: false; status: number; error: string };

const reject = (status: number, error: string): QuickMeetingAdmissionDecision => ({ allowed: false, status, error });

export function checkQuickMeetingLink(meeting: QuickMeetingAccessRecord, link: QuickMeetingLinkAccessRecord, now = Date.now()): QuickMeetingAdmissionDecision {
  if (meeting.meeting_kind !== "quick" || meeting.access_mode !== "link") return reject(404, "This quick meeting link is unavailable.");
  if (meeting.status !== "active") return reject(410, "This quick meeting has ended.");
  if (Date.parse(meeting.expires_at) <= now || Date.parse(link.expires_at) <= now) return reject(410, "This quick meeting link has expired.");
  if (link.revoked_at) return reject(410, "This quick meeting link has been revoked.");
  return { allowed: true };
}

export function checkQuickGuestAdmission(context: QuickMeetingAdmissionContext): QuickMeetingAdmissionDecision {
  const linkDecision = checkQuickMeetingLink(context.meeting, context.link, context.now);
  if (!linkDecision.allowed) return linkDecision;
  if (context.meeting.admission_locked && !context.identityAlreadyPresent && !context.returningParticipant) return reject(423, "The host has paused new guest admissions. Try again shortly.");
  if (!Number.isInteger(context.meeting.max_participants) || context.meeting.max_participants < 2 || context.meeting.max_participants > 4 || !Number.isInteger(context.participantCount) || context.participantCount < 0) {
    return reject(503, "The quick meeting room is not configured correctly.");
  }
  if (!context.identityAlreadyPresent && context.participantCount >= context.meeting.max_participants) {
    return reject(409, "This quick meeting is full. Ask the host to remove someone or increase its capacity.");
  }
  return { allowed: true };
}

export function canCreateQuickMeeting(isSuperAdmin: boolean, permissions: readonly string[]): boolean {
  return isSuperAdmin || permissions.includes("mtg_create");
}

export function normalizeQuickParticipantName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return clean.length >= 2 && clean.length <= 80 ? clean : null;
}

export function isQuickMeetingSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
