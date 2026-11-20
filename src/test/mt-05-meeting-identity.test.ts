import { describe, expect, it } from "vitest";
import { normalizeMeetingIdentity, validateMeetingIdentity } from "../app/pages/return-register/meetingIdentity";

describe("MT-05 meeting identity", () => {
  it("normalizes title, meeting type, and governance body into the SQL identity fields", () => {
    const identity = normalizeMeetingIdentity({
      meeting_title: "  344th Board Meeting  ",
      meeting_type: "  Regular  ",
      committee: "  Board of Directors  ",
    });

    expect(identity).toEqual({
      meeting_title: "344th Board Meeting",
      meeting_type: "Regular",
      committee: "Board of Directors",
    });
    expect(validateMeetingIdentity(identity)).toEqual([]);
  });

  it("blocks each missing identity field before the record is written", () => {
    expect(validateMeetingIdentity(normalizeMeetingIdentity({
      meeting_title: "", meeting_type: "Regular", committee: "Board of Directors",
    }))).toContain("Meeting title is required");
    expect(validateMeetingIdentity(normalizeMeetingIdentity({
      meeting_title: "Board Meeting", meeting_type: " ", committee: "Board of Directors",
    }))).toContain("Meeting type is required");
    expect(validateMeetingIdentity(normalizeMeetingIdentity({
      meeting_title: "Board Meeting", meeting_type: "Regular", committee: "",
    }))).toContain("Governance body is required");
  });

  it("rejects unknown or forged meeting types not present in the approved select", () => {
    for (const type of ["Invented", "Regular,Special", "Regular\\nSpecial", "regular"]) {
      const identity = normalizeMeetingIdentity({
        meeting_title: "Board Meeting",
        meeting_type: type,
        committee: "Board of Directors",
      });
      expect(validateMeetingIdentity(identity)).toContain("Select a valid meeting type");
    }
  });

  it("accepts each current approved type after trimming, without redesigning the select", () => {
    const approved = ["Regular", "Special", "Emergency", "Annual", "Extraordinary"];
    for (const type of approved) {
      const identity = normalizeMeetingIdentity({
        meeting_title: "Board Meeting",
        meeting_type: "  " + type + "  ",
        committee: "Board of Directors",
      });
      expect(identity.meeting_type).toBe(type);
      expect(validateMeetingIdentity(identity)).toEqual([]);
    }
  });

});
