import { describe, expect, it } from "vitest";
import { buildInitialValuesFromRow } from "../app/components/forms/formInitialValues";
import { MEETING_FORM_FIELDS, MEETING_FORM_SECTIONS } from "../app/pages/boardMeetingFormFields";
import { MEETING_DRAWER_COLS } from "../app/pages/boardMeetingDrawerSchemas";
import { meetingContextPayload, mergeMeetingUpdateValues } from "../app/pages/return-register/meetingContext";

const contextKeys = ["confidentiality", "purpose", "description", "notes"];

describe("MT-08 meeting confidentiality and notes", () => {
  it("keeps description and supporting notes as separate restored form values", () => {
    const contextFields = MEETING_FORM_FIELDS.filter(field => field.key && contextKeys.includes(field.key));
    const row = {
      confidentiality: "Strictly Confidential",
      purpose: "Review the annual risk strategy",
      description: "Detailed background for the meeting.",
      notes: "Bring the signed risk appendix.",
    };

    expect(buildInitialValuesFromRow(row, contextFields)).toEqual(row);
    expect(MEETING_FORM_FIELDS.find(field => field.key === "notes")).toMatchObject({
      label: "Supporting Notes",
      type: "textarea",
      step: 0,
    });
    expect(MEETING_FORM_SECTIONS.find(section => section.id === "s0-purpose")?.fieldKeys)
      .toContain("notes");
    const drawerKeys = MEETING_DRAWER_COLS.flatMap(section =>
      section.type === "group" ? section.group.cols : [section.col],
    ).map(column => column.key);
    expect(drawerKeys).toEqual(expect.arrayContaining(["description", "notes"]));
  });

  it("persists all four values distinctly for create, draft, and edit payloads", () => {
    const values = {
      confidentiality: "Restricted",
      purpose: "Approve the business continuity plan",
      description: "Review the updated recovery objectives.",
      notes: "The security team will bring the latest tabletop results.",
    };

    expect(meetingContextPayload(values, "Confidential")).toEqual(values);
    expect(meetingContextPayload({ purpose: "Board review" }, "Confidential")).toEqual({
      confidentiality: "Confidential",
      purpose: "Board review",
      description: "",
      notes: "",
    });
    expect(meetingContextPayload({ purpose: "Board review" }, "").confidentiality).toBe("");
  });

  it("preserves existing meeting context on partial updates while allowing explicit clears", () => {
    const existing = {
      confidentiality: "Restricted",
      purpose: "Annual governance review",
      description: "Review the current plan.",
      notes: "Bring the supporting schedule.",
    };
    const partial = mergeMeetingUpdateValues(existing, { meeting_title: "Updated title" });
    const cleared = mergeMeetingUpdateValues(existing, { notes: "" });

    expect(meetingContextPayload(partial, "")).toEqual(existing);
    expect(meetingContextPayload(cleared, "").notes).toBe("");
  });
});
