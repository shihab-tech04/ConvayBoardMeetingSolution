import { MEETING_LEADERSHIP_ROLES, type MeetingLeadershipResolution } from "./meetingLeadership";

const PARTICIPANT_ROLES = {
  chairperson: "Chairperson", secretary: "Meeting Secretary", organizer: "Organizer",
} as const;
export type LeaderParticipantRole = typeof PARTICIPANT_ROLES[keyof typeof PARTICIPANT_ROLES];
export interface RosterLeaderLink { user_id: string; participant_type: string; is_required: boolean }

/** Identity comes exclusively from the existing canonical leadership resolver.
 * One person may hold several assigned roles; keep any valid assigned role. */
export function leadershipRosterRoles(leadership: MeetingLeadershipResolution): Map<string, LeaderParticipantRole[]> {
  const roles = new Map<string, LeaderParticipantRole[]>();
  for (const field of MEETING_LEADERSHIP_ROLES) {
    const id = leadership.ids[field];
    if (!id) continue;
    roles.set(id, [...(roles.get(id) ?? []), PARTICIPANT_ROLES[field]]);
  }
  return roles;
}

export function validateLeadershipRoster(links: readonly RosterLeaderLink[], leadership: MeetingLeadershipResolution): string[] {
  if (leadership.missing.length) return ["Select active registered users for all meeting leadership roles."];
  const errors: string[] = [];
  for (const [id, roles] of leadershipRosterRoles(leadership)) {
    const matches = links.filter(link => link.user_id === id);
    if (matches.length !== 1) {
      errors.push(`Keep one participant record for the assigned ${roles.join(" / ")}.`);
      continue;
    }
    if (!matches[0].is_required || !roles.some(role => role === matches[0].participant_type)) {
      errors.push(`The assigned ${roles.join(" / ")} must remain a required leadership participant.`);
    }
  }
  return errors;
}
