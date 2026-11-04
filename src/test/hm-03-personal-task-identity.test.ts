import { describe, expect, it } from "vitest";
import {
  fieldMatchesUser, roleAssignmentMatchesUser, userIsInvolvedInMeeting, userIsParticipant,
  userIsMinutesOwner,
} from "../app/pages/dashboard/homeWorkspaceUtils";

describe("HM-03 personal work queue identity matching", () => {
  it("rejects substring collisions between different people", () => {
    expect(fieldMatchesUser("Anna", "Ann")).toBe(false);
    expect(fieldMatchesUser("Ann", "Anna")).toBe(false);
    expect(fieldMatchesUser("Johnathon Smith", "John Smith")).toBe(false);
    expect(fieldMatchesUser("Jane Doe Jr", "Jane Doe")).toBe(false);
    expect(fieldMatchesUser("A", "Anna")).toBe(false);
  });

  it("accepts exact names regardless of case, Unicode form, or extra spaces", () => {
    expect(fieldMatchesUser("Jane   Doe", "jane doe")).toBe(true);
    expect(fieldMatchesUser("Dr. Jane Doe", "Jane Doe")).toBe(true);
    expect(fieldMatchesUser("Chairperson: Jane Doe", "Jane Doe")).toBe(true);
    expect(fieldMatchesUser("Jane Doe (Chairperson)", "Jane Doe")).toBe(true);
  });

  it("supports multiple genuine assignees without matching their neighbors", () => {
    expect(fieldMatchesUser(["Jane Doe", "John Roe"], "John Roe")).toBe(true);
    expect(fieldMatchesUser('["Jane Doe", "John Roe"]', "Jane Doe")).toBe(true);
    expect(fieldMatchesUser("Jane Doe; John Roe", "John Roe")).toBe(true);
    expect(fieldMatchesUser("Jane Doe; John Roe", "Jan")).toBe(false);
    expect(fieldMatchesUser(null, "Jane Doe")).toBe(false);
    expect(fieldMatchesUser({}, "Jane Doe")).toBe(false);
  });

  it("matches the assigned role, not every account with workflow duties", () => {
    expect(roleAssignmentMatchesUser("Administrator", "super_admin", "")).toBe(true);
    expect(roleAssignmentMatchesUser("Company Secretary", "company_secretary", "")).toBe(true);
    expect(roleAssignmentMatchesUser("Admin", "company_secretary", "Company Secretary")).toBe(false);
    expect(roleAssignmentMatchesUser("Secretariat", "super_admin", "Administrator")).toBe(false);
    expect(roleAssignmentMatchesUser("Finance Lead", "user", "Finance Lead")).toBe(true);
    expect(roleAssignmentMatchesUser("", "super_admin", "")).toBe(false);
  });

  it("protects shared meeting and minute ownership views against partial names", () => {
    expect(userIsInvolvedInMeeting({ organizer: "Anna" }, "Ann")).toBe(false);
    expect(userIsParticipant([{ meeting_id: "m1", name: "Anna" }], "m1", "Ann")).toBe(false);
    expect(userIsMinutesOwner({ minute_taker: "Anna", co_authors: ["Jo", "John"] }, "Ann")).toBe(false);
    expect(userIsMinutesOwner({ minute_taker: "Anna", co_authors: ["Jo", "John"] }, "John")).toBe(true);
  });
});
