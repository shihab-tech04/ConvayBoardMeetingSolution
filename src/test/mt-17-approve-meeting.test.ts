import { describe, expect, it } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";

function approvalContext(permissions: string[]): ActionContext {
  return {
    entity: "meeting",
    record: { id: "MTG-MT17-TEST", approval_status: "Pending Approval" },
    currentUser: { id: "user-17", name: "Meeting Approver" },
    userRole: "User",
    permissions,
    now: new Date("2026-11-05T12:00:00.000Z"),
  };
}

describe("MT-17 approve meeting request", () => {
  it("exposes approval only to users with the canonical meeting approval permission", () => {
    const action = resolveMeetingActions(approvalContext(["mtg_approve"]))
      .find(candidate => candidate.id === "approve");

    expect(action?.visible).toBe(true);
    expect(action?.enabled).toBe(true);
    expect(action?.requiresConfirmation).toBe(true);
    expect(action?.confirmMessage).toContain("Approve this meeting");
  });

  it("keeps approval unavailable to users without the approval grant", () => {
    const action = resolveMeetingActions(approvalContext(["mtg_view"]))
      .find(candidate => candidate.id === "approve");

    expect(action?.visible).toBe(false);
    expect(action?.enabled).toBe(false);
  });
});
