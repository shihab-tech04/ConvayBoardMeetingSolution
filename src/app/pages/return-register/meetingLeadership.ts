export const MEETING_LEADERSHIP_ROLES = ["chairperson", "secretary", "organizer"] as const;

export type MeetingLeadershipRole = typeof MEETING_LEADERSHIP_ROLES[number];

export interface MeetingLeadershipUser {
  id: string;
  name: string;
  status?: string;
}

export interface MeetingLeadershipResolution {
  ids: Record<MeetingLeadershipRole, string>;
  names: Record<MeetingLeadershipRole, string>;
  missing: MeetingLeadershipRole[];
}

export type MeetingLeadershipPayload = {
  chairperson: string;
  chairperson_user_id: string;
  secretary: string;
  secretary_user_id: string;
  organizer: string;
  organizer_user_id: string;
};

const ROLE_LABELS: Record<MeetingLeadershipRole, string> = {
  chairperson: "Chairperson",
  secretary: "Meeting Secretary",
  organizer: "Meeting Organizer",
};

function legacyName(value: string): string {
  return value.split(" — ", 1)[0].split(" (", 1)[0].trim();
}

export function meetingLeadershipLabel(role: MeetingLeadershipRole): string {
  return ROLE_LABELS[role];
}

export function meetingLeadershipPayload(resolution: MeetingLeadershipResolution): MeetingLeadershipPayload {
  return {
    chairperson: resolution.names.chairperson,
    chairperson_user_id: resolution.ids.chairperson,
    secretary: resolution.names.secretary,
    secretary_user_id: resolution.ids.secretary,
    organizer: resolution.names.organizer,
    organizer_user_id: resolution.ids.organizer,
  };
}

/** Resolve saved/form values only to active registered users and avoid guessing between duplicate names. */
export function resolveMeetingLeadership(
  values: Record<string, unknown>,
  users: MeetingLeadershipUser[],
): MeetingLeadershipResolution {
  const activeUsers = users.filter(user =>
    user.id.trim() !== "" && user.name.trim() !== "" && (!user.status || user.status === "Active"),
  );
  const ids = {} as Record<MeetingLeadershipRole, string>;
  const names = {} as Record<MeetingLeadershipRole, string>;
  const missing: MeetingLeadershipRole[] = [];

  for (const role of MEETING_LEADERSHIP_ROLES) {
    const value = String(values[role] ?? "").trim();
    let selected = activeUsers.find(user => user.id === value);
    if (!selected && value) {
      const name = legacyName(value);
      const matches = activeUsers.filter(user => user.name.trim() === name);
      if (matches.length === 1) selected = matches[0];
    }

    ids[role] = selected?.id ?? "";
    names[role] = selected?.name ?? "";
    if (!selected) missing.push(role);
  }

  return { ids, names, missing };
}
