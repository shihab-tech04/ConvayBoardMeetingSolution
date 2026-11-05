import { describe, expect, it } from "vitest";
import { resolveDashboardMeetingDestination as destination } from "../app/pages/dashboard/dashboardContextActions";

describe("HM-08 dashboard contextual action destinations", () => {
  it.each([
    ["start", "start_meeting"], ["start_meeting", "start_meeting"],
    ["join", "join_meeting"], ["rejoin", "rejoin_meeting"],
    ["continue_meeting", "continue_meeting"], ["resume_meeting", "resume_meeting"],
    ["resume_break", "resume_after_break"], ["resume_after_break", "resume_after_break"],
    ["resume_adjourned", "continue_meeting"],
  ] as const)("routes %s to the correct live workspace entry %s", (id, expected) => {
    expect(destination(id, "MTG-01")).toMatchObject({kind:"live", entryAction:expected});
  });

  it("routes authorizing approval to the workflow, not a passive modal", () => {
    expect(destination("approve", "MTG-01")).toEqual({
      kind: "route", path: "/meetings/meeting-overview", label: "Review meeting approval",
    });
  });

  it("keeps administrative mutations in the canonical meeting register", () => {
    expect(destination("publish", "MTG-01")).toEqual({
      kind: "route", path: "/meetings/all-meetings", label: "Manage meeting",
    });
    expect(destination("schedule_meeting", "MTG-01")).toEqual({
      kind: "route", path: "/meetings/all-meetings", label: "Manage meeting",
    });
    expect(destination("publish_meeting", "MTG-01")).toEqual({
      kind: "route", path: "/meetings/all-meetings", label: "Manage meeting",
    });
  });

  it("opens the correct existing record and create routes", () => {
    expect(destination("view_record", "MTG-2026/001")).toMatchObject({
      kind: "route", path: "/meetings/MTG-2026%2F001/record",
    });
    expect(destination("create_next_meeting", "MTG-01")).toMatchObject({
      kind: "route", path: "/meetings/all-meetings?create=1",
    });
  });

  it("does not invent a live meeting context for an empty meeting ID", () => {
    expect(destination("resume_break", "")).toEqual({kind:"details",label:"View details"});
  });

  it("does not mislabel an unsupported operation as a completed mutation", () => {
    expect(destination("unsupported_action", "MTG-01")).toEqual({
      kind:"details",label:"View details",
    });
  });
});
