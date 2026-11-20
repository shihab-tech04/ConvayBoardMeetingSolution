import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveRSVPIdentity } from "../app/pages/return-register/rsvpIdentity";

const meeting = { meeting_id: "MTG-1", meeting_title: "Board Meeting" };
const member = { meeting_id: "MTG-1", participant_id: "P-1", name: "A. Member" };
const input = {
  meeting_id: "MTG-1", participant_name: "A. Member",
  response: "Accepted", response_date: "2028-02-29",
};
const page = readFileSync(
  fileURLToPath(new URL("../app/pages/return-register/RSVPManagementPage.tsx", import.meta.url)),
  "utf8",
);

describe("WS-A RSVP meeting/participant identity and SQL read-state guard", () => {
  it("persists canonical meeting and participant IDs and approved response", () => {
    expect(resolveRSVPIdentity(input, [meeting], [member])).toEqual({
      meeting_id: "MTG-1", meeting_title: "Board Meeting",
      participant_id: "P-1", participant_name: "A. Member",
      response: "Accepted", response_date: "2028-02-29",
    });
  });

  it("rejects an unknown meeting instead of persisting a free-text orphan", () => {
    expect(() => resolveRSVPIdentity(input, [], [member])).toThrow("meeting is missing");
  });

  it("rejects a participant linked to a different meeting", () => {
    expect(() => resolveRSVPIdentity(input, [meeting], [
      { ...member, meeting_id: "MTG-OTHER" },
    ])).toThrow("participant is missing");
  });

  it("rejects ambiguous meeting keys or duplicate participant names for one meeting", () => {
    expect(() => resolveRSVPIdentity(input, [meeting, meeting], [member])).toThrow("meeting is missing or ambiguous");
    expect(() => resolveRSVPIdentity(input, [meeting], [
      member, { ...member, participant_id: "P-2" },
    ])).toThrow("participant is missing or ambiguous");
  });

  it("rejects a missing canonical participant ID", () => {
    expect(() => resolveRSVPIdentity(input, [meeting], [
      { ...member, participant_id: "" },
    ])).toThrow("participant is missing");
  });

  it("denies unapproved responses and impossible dates without fabricating a save", () => {
    expect(() => resolveRSVPIdentity({ ...input, response: "Approved" }, [meeting], [member])).toThrow("valid RSVP response");
    for (const date of ["2026-02-30", "2026-13-01", "not-a-date", ""]) {
      expect(() => resolveRSVPIdentity({ ...input, response_date: date }, [meeting], [member])).toThrow("valid RSVP response date");
    }
  });

  it("retains the approved page, but suppresses unverified SQL KPIs and guards writes", () => {
    expect(page).toContain("title: \"RSVP & Invitations\"");
    expect(page).toContain("RSVP_FORM_FIELDS");
    expect(page).toContain("meetingRegisterSourceState(sources)");
    expect(page).toContain("onDataRetry: retrySources");
    expect(page).toContain("kpis: dataLoading || dataError ? [] : kpis");
    expect(page).toContain("if (dataLoading || dataError) throw new Error");
    expect(page).toContain("resolveRSVPIdentity(values, meetingReg.items, participantReg.items)");
    expect(page).toContain("...identity,");
    expect(page).toContain("return addRSVP");
  });
});
