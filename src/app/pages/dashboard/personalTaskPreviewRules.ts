import { fieldMatchesUser, isWorkflowRole, roleAssignmentMatchesUser } from "./homeWorkspaceUtils";

/**
 * HM-02/HM-03: the dashboard's "My Tasks" preview must use the same
 * identity/role assignment rules as the full personal My Tasks page.
 * These are display filters only; authenticated SQL/RLS controls access.
 */
export interface PersonalTaskViewer {
  name: string;
  role: string;
  designation: string;
}

function workflowActor(viewer: PersonalTaskViewer): boolean {
  return isWorkflowRole(viewer.designation) || isWorkflowRole(viewer.role);
}

export function isPersonalMeetingTask(
  meeting: { chairperson?: unknown; secretary?: unknown; organizer?: unknown },
  viewer: PersonalTaskViewer,
): boolean {
  return workflowActor(viewer)
    || fieldMatchesUser(meeting.chairperson, viewer.name)
    || fieldMatchesUser(meeting.secretary, viewer.name)
    || fieldMatchesUser(meeting.organizer, viewer.name);
}

export function isPersonalAgendaTask(
  agenda: { submitted_by?: unknown },
  viewer: PersonalTaskViewer,
): boolean {
  return workflowActor(viewer) || fieldMatchesUser(agenda.submitted_by, viewer.name);
}

export function isPersonalRsvpTask(
  rsvp: { participant_name?: unknown },
  viewer: PersonalTaskViewer,
): boolean {
  return fieldMatchesUser(rsvp.participant_name, viewer.name);
}

export function isPersonalActionTask(
  action: { assigned_to?: unknown },
  viewer: PersonalTaskViewer,
): boolean {
  const assignee = action.assigned_to;
  return fieldMatchesUser(assignee, viewer.name)
    || (workflowActor(viewer)
      && roleAssignmentMatchesUser(assignee, viewer.role, viewer.designation));
}
