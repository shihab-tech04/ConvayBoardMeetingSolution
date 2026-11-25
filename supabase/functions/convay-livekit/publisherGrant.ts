import { checkOnlineAdmission, type AdmissionContext } from "./admission.ts";

/**
 * Server-only media publisher authority.
 * Meeting links come from authenticated, permission-scoped SQL reads,
 * not from request-body role claims. Joining is NOT a publishing grant.
 *
 * Missing/unknown/conflicting role rows deny publication while leaving
 * a genuinely admitted observer's subscribe permission intact.
 */
const AUTHORIZED_PUBLISHERS = new Set([
  "chairperson", "chair", "meeting secretary", "company secretary",
  "member", "board member", "independent director",
  "presenter", "organizer", "administrator",
]);

function trustedLinkPublisher(link: AdmissionContext["links"][number]): boolean {
  if (!("participant_type" in link) || typeof link.participant_type !== "string") return false;
  return AUTHORIZED_PUBLISHERS.has(link.participant_type.trim().toLowerCase());
}

export function canPublishOnlineMeeting(ctx: AdmissionContext): boolean {
  if (!checkOnlineAdmission(ctx).allowed) return false;
  if (ctx.isSuperAdmin) return true;

  const meetingId = ctx.meeting.meeting_id ?? ctx.meeting.id;
  const matching = ctx.links.filter(link =>
    link.meeting_id === meetingId && link.user_id === ctx.userId
  );
  if (matching.length) {
    // An Observer/Guest row cannot be outweighed by a conflicting
    // presenter row or a forged leadership display-name claim.
    return matching.every(trustedLinkPublisher);
  }

  // Trusted leaders can join without a roster row. Compare actual user
  // IDs only, never browser-supplied roles or arbitrary display names.
  return [ctx.meeting.created_by, ctx.meeting.chairperson,
    ctx.meeting.secretary, ctx.meeting.organizer]
    .some(id => !!id && id === ctx.userId);
}
