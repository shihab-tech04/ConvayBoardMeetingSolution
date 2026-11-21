import { describe, it, expect } from "vitest";
import {
  isPersonalMeetingTask, isPersonalAgendaTask,
  isPersonalRsvpTask, isPersonalActionTask,
} from "../app/pages/dashboard/personalTaskPreviewRules";

const ann = { name: "Ann", role: "board_member", designation: "Director" };
const secretary = { name: "Anne", role: "company_secretary", designation: "Company Secretary" };

describe("HM-02/HM-03 dashboard personal task preview", () => {
  it("never puts Anna's action assignment into Ann's dashboard", () => {
    expect(isPersonalActionTask({ assigned_to: "Anna" }, ann)).toBe(false);
    expect(isPersonalActionTask({ assigned_to: "Ann" }, ann)).toBe(true);
  });
  it("requires exact workflow role, not any secretary/admin match", () => {
    expect(isPersonalActionTask({ assigned_to: "Admin" }, secretary)).toBe(false);
    expect(isPersonalActionTask({ assigned_to: "Company Secretary" }, secretary)).toBe(true);
    expect(isPersonalActionTask({ assigned_to: "Admin" }, ann)).toBe(false);
  });
  it("restricts meeting and agenda tasks to involved users or workflow users", () => {
    const meeting = { chairperson: "Anna", secretary: "Another Secretary", organizer: "Someone else" };
    expect(isPersonalMeetingTask(meeting, ann)).toBe(false);
    expect(isPersonalMeetingTask({ ...meeting, organizer: "Ann" }, ann)).toBe(true);
    expect(isPersonalMeetingTask(meeting, secretary)).toBe(true);
    expect(isPersonalAgendaTask({ submitted_by: "Anna" }, ann)).toBe(false);
    expect(isPersonalAgendaTask({ submitted_by: "Ann" }, ann)).toBe(true);
    expect(isPersonalAgendaTask({ submitted_by: "Anna" }, secretary)).toBe(true);
  });
  it("never turns a workflow role into another person's RSVP", () => {
    expect(isPersonalRsvpTask({ participant_name: "Another User" }, secretary)).toBe(false);
    expect(isPersonalRsvpTask({ participant_name: "Ann" }, ann)).toBe(true);
  });
  it("fails closed for missing identity and unassigned actions", () => {
    expect(isPersonalActionTask({}, ann)).toBe(false);
    expect(isPersonalMeetingTask({}, { name: "", role: "", designation: "" })).toBe(false);
  });
});
