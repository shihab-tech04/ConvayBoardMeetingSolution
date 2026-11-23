import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RegularAttendanceTransitionQueue, acceptsVerifiedAttendanceRevision } from "../app/pages/meetings/regularMeetingAttendanceQueue";
import { canOfferRegularMeetingPublishing } from "../app/pages/meetings/regularMeetingRoleProjection";
import { canPublishOnlineMeeting } from "../../supabase/functions/convay-livekit/publisherGrant";
import type { AdmissionContext } from "../../supabase/functions/convay-livekit/admission";

const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const transport = readFileSync("src/app/pages/meetings/regularMeetingAttendanceTransport.ts", "utf8");

const admission = (type: string): AdmissionContext => ({
  meeting: { id: "MTG-REG", meeting_id: "MTG-REG", mode: "Virtual", approval_status: "In Progress" },
  session: { meeting_id: "MTG-REG", session_status: "active" },
  links: [{ meeting_id: "MTG-REG", user_id: "participant-1", participant_type: type }],
  userId: "participant-1", isSuperAdmin: false, permissions: ["mtg_join"],
});

describe("WS0 cross-Main LM-19/26 production integration gate", () => {
  it("keeps browser publishing controls strictly within the trusted server's role policy", () => {
    for (const role of ["Chairperson", "Member", "Meeting Secretary", "Observer", "Guest", "Unknown", ""]) {
      expect(canOfferRegularMeetingPublishing([{ participant_type: role }], true, false, false))
        .toBe(canPublishOnlineMeeting(admission(role)));
    }
    expect(canOfferRegularMeetingPublishing([{ participant_type: "Observer" }], true, false, true)).toBe(false);
    expect(canOfferRegularMeetingPublishing([], false, false, true)).toBe(false);
    expect(workspace).toContain("access.loaded && canOfferRegularMeetingPublishing(");
  });

  it("cannot lose a departure behind a previous unacknowledged connection", async () => {
    const queue = new RegularAttendanceTransitionQueue();
    const saved: string[] = [];
    let resolve!: () => void;
    const ack = new Promise<void>(done => { resolve = done; });
    const join = queue.enqueue("participant-1", async () => { await ack; saved.push("Present"); });
    const leave = queue.enqueue("participant-1", async () => { saved.push("Left"); });
    resolve();
    await Promise.all([join, leave]);
    expect(saved).toEqual(["Present", "Left"]);
    expect(acceptsVerifiedAttendanceRevision("MTG-REG", 3, "other-meeting", 2)).toBe(false);
    expect(acceptsVerifiedAttendanceRevision("MTG-REG", 1, "MTG-REG", 2)).toBe(false);
  });

  it("keeps attendance mutations on authenticated Edge plus independent SQL readback", () => {
    expect(transport).toContain('convayAuth.authenticatedRequest("/functions/v1/convay-attendance"');
    expect(transport).toContain("submitAndVerifyRegularAttendance(intent");
    expect(transport).toContain("expectedRevision: initial.attendanceRevision");
    expect(transport).toContain("readback: (id, participant) => readLiveAttendance(id, participant)");
    expect(transport).not.toContain("actorId:");
    expect(workspace).toContain("attendanceQueue.enqueue(id, async () =>");
  });
});
