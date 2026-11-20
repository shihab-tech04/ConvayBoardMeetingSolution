import { describe, expect, it } from "vitest";
import { MEETING_FORM_FIELDS } from "../app/pages/boardMeetingFormFields";
import { meetingAccessBlockers, meetingUpdateAccessBlockers, MEETING_MODE_OPTIONS } from "../app/pages/return-register/meetingAccess";

describe("MT-09/MT-10 — meeting mode, venue, and access", () => {
  it("offers only the approved Physical, Virtual, and Hybrid choices", () => {
    const modeField = MEETING_FORM_FIELDS.find(field => field.key === "mode");
    expect(MEETING_MODE_OPTIONS).toEqual(["Physical", "Virtual", "Hybrid"]);
    expect(modeField).toMatchObject({
      required: true,
      options: ["Physical", "Virtual", "Hybrid"],
      step: 3,
    });
    expect(MEETING_FORM_FIELDS.find(field => field.key === "venue")?.condition)
      .toEqual({ field: "mode", value: ["Physical", "Hybrid"] });
  });

  it("requires a venue for a Physical meeting, but no virtual link", () => {
    expect(meetingAccessBlockers({ mode: "Physical", venue: "" }))
      .toEqual(["Physical meeting requires a venue address"]);
    expect(meetingAccessBlockers({ mode: "Physical", venue: "Board Room A" }))
      .toEqual([]);
  });

  it("requires a virtual link for Virtual meetings, but no venue", () => {
    expect(meetingAccessBlockers({ mode: "Virtual", virtual_link: "" }))
      .toEqual(["Virtual meeting requires a virtual meeting link"]);
    expect(meetingAccessBlockers({ mode: "Virtual", virtual_link: "https://app.convay.com/m/j/123" }))
      .toEqual([]);
  });

  it("requires both venue and virtual link for Hybrid meetings", () => {
    expect(meetingAccessBlockers({ mode: "Hybrid", venue: "", virtual_link: "" }))
      .toEqual([
        "Hybrid meeting requires a venue address",
        "Hybrid meeting requires a virtual meeting link",
      ]);
    expect(meetingAccessBlockers({ mode: "Hybrid", venue: "Board Room B", virtual_link: "" }))
      .toEqual(["Hybrid meeting requires a virtual meeting link"]);
    expect(meetingAccessBlockers({ mode: "Hybrid", venue: "", virtual_link: "https://app.convay.com/m/j/456" }))
      .toEqual(["Hybrid meeting requires a venue address"]);
    expect(meetingAccessBlockers({ mode: "Hybrid", venue: "Board Room B", virtual_link: "https://app.convay.com/m/j/456" }))
      .toEqual([]);
  });

  it("rejects invalid modes and ignores whitespace-only access values", () => {
    expect(meetingAccessBlockers({ mode: "Unknown", venue: "Room A", virtual_link: "https://example.com" }))
      .toEqual(["Select a valid meeting mode"]);
    expect(meetingAccessBlockers({ mode: "Hybrid", venue: "  ", virtual_link: "  " }))
      .toHaveLength(2);
  });
  it("prevents scheduled meeting edits from removing required Hybrid access", () => {
    const saved = {
      approval_status: "Scheduled",
      mode: "Hybrid",
      venue: "Conference Room B",
      virtual_link: "https://app.convay.com/m/j/456",
    };
    expect(meetingUpdateAccessBlockers(saved, { venue: "" }))
      .toEqual(["Hybrid meeting requires a venue address"]);
    expect(meetingUpdateAccessBlockers(saved, { virtual_link: "" }))
      .toEqual(["Hybrid meeting requires a virtual meeting link"]);
    expect(meetingUpdateAccessBlockers(saved, { mode: "Physical", venue: "Conference Room B" }))
      .toEqual([]);
    expect(meetingUpdateAccessBlockers(saved, { notes: "Unrelated update" }))
      .toEqual([]);
  });

  it("allows incomplete drafts without allowing invalid scheduled access edits", () => {
    const draft = { approval_status: "Draft", mode: "Hybrid", venue: "Room A", virtual_link: "" };
    expect(meetingUpdateAccessBlockers(draft, { venue: "" })).toEqual([]);
    const physical = { approval_status: "Approved", mode: "Physical", venue: "Room A" };
    expect(meetingUpdateAccessBlockers(physical, { mode: "Hybrid" }))
      .toEqual(["Hybrid meeting requires a virtual meeting link"]);
  });


  it("does not trust conflicting persisted lifecycle status aliases", () => {
    const contradictory = {
      approval_status: "Draft", status: "Scheduled", mode: "Hybrid",
      venue: "Board Room A", virtual_link: "https://example.com/live",
    };
    expect(meetingUpdateAccessBlockers(contradictory, { venue: "" }))
      .toEqual(["Hybrid meeting requires a venue address"]);
    expect(meetingUpdateAccessBlockers({
      ...contradictory, approval_status: "Scheduled", status: "Draft",
    }, { virtual_link: "" }))
      .toEqual(["Hybrid meeting requires a virtual meeting link"]);
  });

  it("rejects attempts to bypass scheduled access by patching both state aliases to Draft", () => {
    const scheduled = {
      approval_status: "Scheduled", status: "Scheduled",
      mode: "Hybrid", venue: "Room A", virtual_link: "https://example.com/live",
    };
    expect(meetingUpdateAccessBlockers(scheduled, {
      approval_status: "Draft", status: "Draft", venue: "",
    })).toEqual(["Hybrid meeting requires a venue address"]);
  });

  it("allows intentionally incomplete Draft edits with explicit consistent lifecycle evidence", () => {
    const draft = {
      approval_status: " draft ", status: "DRAFT",
      mode: "Hybrid", venue: "", virtual_link: "",
    };
    expect(meetingUpdateAccessBlockers(draft, { venue: "" })).toEqual([]);
    expect(meetingUpdateAccessBlockers({ status: "Draft", mode: "Hybrid" }, { virtual_link: "" }))
      .toEqual([]);
  });

  it("does not assume a missing lifecycle status means Draft", () => {
    expect(meetingUpdateAccessBlockers({ mode: "Hybrid", venue: "Room A", virtual_link: "https://example.com/live" }, {
      venue: "",
    })).toEqual(["Hybrid meeting requires a venue address"]);
  });

});
