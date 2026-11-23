/**
 * WS-E / LM-19 — browser presentation of regular LiveKit admission roles.
 *
 * This is UI gating only. LiveKit tokens must be granted by the trusted server.
 * Keep recognized values in sync with convay-livekit/publisherGrant.ts; unknown
 * or contradictory saved membership must not become a Board Member fallback.
 */
export type RegularMeetingRole =
  | "Chairperson" | "Company Secretary" | "Board Member"
  | "Independent Director" | "Presenter" | "Observer"
  | "Guest" | "Administrator";

const roleAliases: Record<string, RegularMeetingRole> = {
  "chairperson": "Chairperson",
  "chair": "Chairperson",
  "meeting secretary": "Company Secretary",
  "company secretary": "Company Secretary",
  "secretary": "Company Secretary",
  "member": "Board Member",
  "board member": "Board Member",
  "independent director": "Independent Director",
  "presenter": "Presenter",
  "organizer": "Administrator",
  "administrator": "Administrator",
  "observer": "Observer",
  "guest": "Guest",
};

const publishableRoles = new Set<RegularMeetingRole>([
  "Chairperson", "Company Secretary", "Board Member",
  "Independent Director", "Presenter", "Administrator",
]);

export function savedRegularMeetingRole(role: unknown): RegularMeetingRole {
  return typeof role === "string"
    ? (roleAliases[role.trim().toLowerCase()] ?? "Observer")
    : "Observer";
}

/** Mirror issuer eligibility for controls; never use this as an auth grant. */
export function canOfferRegularMeetingPublishing(
  actorLinks: ReadonlyArray<{ participant_type?: string | null }>,
  canJoin: boolean,
  isSuperAdmin: boolean,
  isVerifiedLeaderById: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!canJoin) return false;
  if (actorLinks.length > 0) {
    return actorLinks.every(link => {
      const role = link.participant_type;
      return typeof role === "string"
        && Object.prototype.hasOwnProperty.call(roleAliases, role.trim().toLowerCase())
        && publishableRoles.has(savedRegularMeetingRole(role));
    });
  }
  return isVerifiedLeaderById;
}
