import { describe, expect, it } from "vitest";
import { MEETING_FORM_FIELDS } from "../app/pages/boardMeetingFormFields";
import { meetingAccessBlockers, MEETING_MODE_OPTIONS } from "../app/pages/return-register/meetingAccess";

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
});
