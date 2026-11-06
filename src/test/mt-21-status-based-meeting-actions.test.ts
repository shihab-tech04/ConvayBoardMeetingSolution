import { describe, expect, it } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext, MeetingRole } from "../app/actions/types";
import { actionGranted, filterActionsByAccess } from "../app/services/supabase/actionPermissions";
import { ROW_VIEW } from "../app/data/modulePageConfigs";

const now = new Date("2026-12-10T09:55:00");

function context(
  status: string,
  role: MeetingRole = "organizer",
  permissions = ["mtg_view", "mtg_update", "mtg_cancel", "mtg_approve", "mtg_join", "mtg_start", "mtg_postpone"],
): ActionContext {
  return {
    entity: "meeting",
    record: {
      id: "MTG-MT21",
      meeting_id: "MTG-MT21",
      approval_status: status,
      organizer_user_id: "organizer-id",
      chairperson_user_id: "host-id",
      secretary_user_id: "secretary-id",
      meeting_date: "2026-12-10",
      start_time: "10:00",
      draft_current_step: 4,
    },
    currentUser: { id: "organizer-id", name: "Organizer" },
    userRole: "Meeting Organizer",
    meetingRoles: [role],
    permissions,
    now,
  };
}
function ids(ctx: ActionContext) {
  return resolveMeetingActions(ctx).filter(a => a.visible).map(a => a.id);
}

describe("MT-21 meeting actions by lifecycle state", () => {
  it("keeps the approved View entry in every meeting-register table row", () => {
    expect(ROW_VIEW.map(a => a.id)).toEqual(["view"]);
  });

  it("offers draft setup, submission and deletion only to meeting leadership", () => {
    expect(ids(context("Draft"))).toEqual(["continue_setup", "submit_for_approval", "delete"]);
    expect(ids(context("Draft", "viewer"))).toEqual([]);
  });

  it("offers approval, revision and rejection only in Pending Approval to an approver", () => {
    expect(ids(context("Pending Approval", "approver"))).toEqual(["approve", "request_revision", "reject"]);
    expect(ids(context("Pending Approval", "participant"))).toEqual([]);
    expect(ids(context("Approved"))).toContain("schedule_meeting");
    expect(ids(context("Approved"))).not.toContain("approve");
  });

  it("exposes scheduling and publishing in order and never starts a merely scheduled meeting", () => {
    expect(ids(context("Approved"))).toContain("schedule_meeting");
    expect(ids(context("Approved"))).not.toContain("publish_meeting");
    expect(ids(context("Scheduled"))).toContain("publish_meeting");
    expect(ids(context("Scheduled"))).toContain("cancel");
    expect(ids(context("Scheduled"))).not.toContain("start");
    expect(ids(context("Scheduled"))).not.toContain("join");
    expect(ids(context("Published", "host"))).toContain("start");
  });

  it("keeps Start and Join limited to assigned meeting roles", () => {
    expect(ids(context("Published", "participant"))).toContain("join");
    expect(ids(context("Published", "viewer"))).not.toContain("join");
    expect(ids(context("In Progress", "participant"))).toContain("rejoin");
    expect(ids(context("In Progress", "viewer"))).not.toContain("rejoin");
    expect(ids(context("Paused", "viewer"))).not.toContain("rejoin");
    expect(ids(context("On Break", "viewer"))).not.toContain("rejoin");
  });

  it("does not allow duplicate display names to impersonate canonical leadership or invitees", () => {
    const c = context("Published", "viewer");
    delete c.meetingRoles;
    c.record.chairperson = "Alex Same";
    c.record.chairperson_user_id = "different-user-id";
    c.currentUser = { id: "viewer-id", name: "Alex Same" };
    expect(ids(c)).not.toContain("start");
    c.record.chairperson_user_id = "";
    expect(ids(c)).toContain("start");

    const attendee = context("In Progress", "viewer");
    delete attendee.meetingRoles;
    attendee.currentUser = { id: "viewer-id", name: "Alex Same" };
    attendee.relationships = { participants: [{
      meeting_id: "MTG-MT21", person_name: "Alex Same", user_id: "different-user-id", role: "Member",
    }] };
    expect(ids(attendee)).not.toContain("rejoin");
  });

  it("keeps requested revisions editable but prevents rejection from inheriting edit/cancel", () => {
    const revision = ids(context("Revision Requested"));
    expect(revision).toContain("edit");
    expect(revision).toContain("view_record");
    expect(revision).not.toContain("cancel");
    expect(revision).not.toContain("approve");

    for (const status of ["Rejected", "Unknown Status"]) {
      expect(ids(context(status))).toEqual(["view_record"]);
    }
    expect(ids(context("Postponed"))).toContain("reschedule_meeting");
    expect(ids(context("Postponed", "viewer"))).toEqual(["view_record"]);
    expect(ids(context("Rescheduled"))).toContain("publish_meeting");
  });

  it("requires the SQL permission as well as lifecycle role for dangerous actions", () => {
    const actions = resolveMeetingActions(context("Scheduled"));
    expect(filterActionsByAccess("meeting", actions, ["mtg_view"], false)).toEqual([]);
    expect(actionGranted("meeting", "cancel", ["mtg_update"], false)).toBe(false);
    expect(actionGranted("meeting", "cancel", ["mtg_cancel"], false)).toBe(true);
    expect(filterActionsByAccess("meeting", actions, ["mtg_cancel"], false).map(a => a.id))
      .toEqual(["cancel"]);
  });
});
