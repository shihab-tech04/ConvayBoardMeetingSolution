import { describe, expect, it } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext, MeetingRole } from "../app/actions/types";

function draftContext(savedStep: number, role: MeetingRole = "organizer"): ActionContext {
  return {
    entity: "meeting",
    record: {
      id: "MTG-MT16-TEST",
      meeting_id: "MTG-MT16-TEST",
      approval_status: "Draft",
      draft_current_step: String(savedStep),
    },
    currentUser: { id: "user-1", name: "Meeting Owner" },
    userRole: "User",
    permissions: ["mtg_update"],
    meetingRoles: [role],
    now: new Date("2026-11-05T12:00:00.000Z"),
  };
}

function submitAction(savedStep: number, role?: MeetingRole) {
  return resolveMeetingActions(draftContext(savedStep, role)).find(action => action.id === "submit_for_approval");
}

describe("MT-16 submit prepared meeting for approval", () => {
  it.each([0, 1, 2, 3])("keeps submission disabled at wizard step %i", savedStep => {
    const action = submitAction(savedStep);

    expect(action?.visible).toBe(true);
    expect(action?.enabled).toBe(false);
    expect(action?.disabledReason).toBe("Finish the meeting setup before submitting for approval.");
  });

  it.each(["organizer", "host", "secretary"] as const)("allows an authorized %s to submit at the review step", role => {
    const action = submitAction(4, role);

    expect(action?.visible).toBe(true);
    expect(action?.enabled).toBe(true);
    expect(action?.requiresConfirmation).toBe(true);
    expect(action?.confirmMessage).toContain("Submit this meeting for approval");
  });

  it("hides submission from a viewer even when setup is complete", () => {
    const action = submitAction(4, "viewer");

    expect(action?.visible).toBe(false);
  });
});
