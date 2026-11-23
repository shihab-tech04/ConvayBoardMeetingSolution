import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkOnlineAdmission as tokenAdmission, type AdmissionContext } from "../../supabase/functions/convay-livekit/admission";
import { checkOnlineAdmission as attendanceAdmission } from "../../supabase/functions/convay-attendance/admission";
import { canPublishOnlineMeeting } from "../../supabase/functions/convay-livekit/publisherGrant";

const valid = (): AdmissionContext => ({
  meeting: {
    id: "MTG-1", meeting_id: "MTG-1", mode: "Virtual",
    meeting_mode: "Virtual", approval_status: "Approved",
    status: "In Progress", workflow_status: "In Progress",
  },
  session: { meeting_id: "MTG-1", session_status: "active" },
  links: [{ meeting_id: "MTG-1", user_id: "user-1", participant_type: "Presenter" }],
  userId: "user-1",
  isSuperAdmin: false,
  permissions: ["mtg_join"],
});

const authorities = [
  ["LiveKit tokens", tokenAdmission],
  ["attendance confirmation", attendanceAdmission],
] as const;

describe("WS5: Edge admission is at least as restrictive as SQL meeting lifecycle", () => {
  for (const [name, admit] of authorities) {
    it(`${name}: still accepts an active, consistent meeting`, () => {
      expect(admit(valid())).toEqual({ allowed: true });
    });
    it.each(["Draft", "Cancelled", "Rejected", "Completed", "Ended", "Archived"])(
      `${name}: denies terminal workflow_status=%s even when approval and status appear active`,
      workflow_status => {
        expect(admit({ ...valid(), meeting: { ...valid().meeting, workflow_status } }))
          .toMatchObject({ allowed: false, status: 409 });
      },
    );
    it(`${name}: rejects contradictory Virtual / Hybrid mode aliases`, () => {
      expect(admit({ ...valid(), meeting: {
        ...valid().meeting, mode: "Virtual", meeting_mode: "Hybrid",
      } })).toMatchObject({ allowed: false, status: 409 });
    });
    it(`${name}: foreign active session cannot authorize another meeting`, () => {
      expect(admit({ ...valid(), session: {
        meeting_id: "MTG-2", session_status: "active",
      } })).toMatchObject({ allowed: false, status: 409 });
    });
    it(`${name}: preserves started legacy session records without a meeting_id property`, () => {
      expect(admit({ ...valid(), session: { session_status: "paused" } }))
        .toEqual({ allowed: true });
    });
  }

  it("rejects media publication for terminal workflow or a foreign session", () => {
    expect(canPublishOnlineMeeting({ ...valid(), meeting: {
      ...valid().meeting, workflow_status: "Cancelled",
    } })).toBe(false);
    expect(canPublishOnlineMeeting({ ...valid(), session: {
      meeting_id: "MTG-2", session_status: "active",
    } })).toBe(false);
  });

  it("both Edge issuers require exactly one live session, preserving SQL parity", () => {
    for (const path of [
      "supabase/functions/convay-livekit/index.ts",
      "supabase/functions/convay-attendance/index.ts",
    ]) {
      const issuer = readFileSync(path, "utf8");
      expect(issuer).toContain("const activeSessions = sessions.filter(");
      expect(issuer).toContain("activeSessions.length !== 1");
      expect(issuer).not.toContain("sessions.find(");
    }
  });
});
