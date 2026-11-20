import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DRAFT_DELETION_UNAVAILABLE_REASON,
  guardMeetingDrawerAction,
} from "../app/pages/return-register/meetingDeletionReleaseGate";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";

const draftContext: ActionContext = {
  entity: "meeting",
  record: { id: "M-1", meeting_id: "M-1", approval_status: "Draft", organizer_user_id: "owner" },
  currentUser: { id: "owner", name: "Owner" },
  userRole: "Meeting Organizer",
  meetingRoles: ["organizer"],
  permissions: ["mtg_view", "mtg_update", "mtg_cancel"],
  now: new Date("2026-11-20T09:00:00Z"),
};

describe("MT-27 no generic meeting DELETE before server security activation", () => {
  it("keeps the approved Draft Delete action visible but disabled with an explicit reason", () => {
    const action = resolveMeetingActions(draftContext).find(x => x.id === "delete");
    expect(action?.visible).toBe(true);
    expect(action).toBeDefined();
    const guarded = guardMeetingDrawerAction(action!);
    expect(guarded.id).toBe("delete");
    expect(guarded.enabled).toBe(false);
    expect(guarded.disabledReason).toBe(DRAFT_DELETION_UNAVAILABLE_REASON);
    expect(guarded.label).toBe(action!.label);
  });

  it("cannot re-enable deletion by supplying an arbitrary enabled flag or reason", () => {
    expect(guardMeetingDrawerAction({ id: "delete", enabled: true, disabledReason: "Allowed" }))
      .toEqual({ id: "delete", enabled: false, disabledReason: DRAFT_DELETION_UNAVAILABLE_REASON });
  });

  it("preserves unrelated approved meeting actions without altering objects", () => {
    for (const id of ["view_record", "cancel", "continue_setup", "schedule_meeting", "publish_meeting"]) {
      const action = { id, label: id, enabled: true, disabledReason: undefined };
      expect(guardMeetingDrawerAction(action)).toBe(action);
    }
  });

  it("does not restore generic registry.remove via an alternate event path", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/pages/return-register/OnlineReturnRegisterPage.tsx"), "utf8");
    expect(source).toContain("guardMeetingDrawerAction({ id: a.id");
    expect(source).toContain("toast.error(DRAFT_DELETION_UNAVAILABLE_REASON)");
    expect(source).not.toMatch(/registry\.remove\s*\(/);
  });
});
