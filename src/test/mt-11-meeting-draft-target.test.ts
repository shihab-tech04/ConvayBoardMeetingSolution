import { describe, expect, it } from "vitest";
import { resolveMeetingDraftTarget } from "../app/pages/return-register/meetingDraftTarget";

describe("MT-11 stable meeting draft identity", () => {
  const draft = { id: "record-1", meeting_id: "MTG-11", approval_status: "Draft" };

  it("resolves a resumed meeting ID to its record ID and relationship ID", () => {
    expect(resolveMeetingDraftTarget("MTG-11", [draft])).toEqual({
      recordId: "record-1",
      meetingId: "MTG-11",
    });
  });

  it("returns null only when no draft ID was supplied", () => {
    expect(resolveMeetingDraftTarget(undefined, [draft])).toBeNull();
    expect(resolveMeetingDraftTarget("", [draft])).toBeNull();
  });

  it("rejects a stale ID instead of silently creating a duplicate meeting", () => {
    expect(() => resolveMeetingDraftTarget("deleted-draft", [draft]))
      .toThrow("This draft is no longer available.");
  });

  it("does not continue a record after it leaves Draft status", () => {
    expect(() => resolveMeetingDraftTarget("MTG-11", [{ ...draft, approval_status: "Scheduled" }]))
      .toThrow("Only a meeting in Draft status can be continued.");
  });
});


describe("MT-14 ambiguous meeting identity denial", () => {
  const draft = { id: "record-a", meeting_id: "MTG-100", approval_status: "Draft" };

  it("continues exactly one matching record through either ID", () => {
    expect(resolveMeetingDraftTarget("record-a", [draft])).toEqual({
      recordId: "record-a", meetingId: "MTG-100",
    });
    expect(resolveMeetingDraftTarget("MTG-100", [draft])).toEqual({
      recordId: "record-a", meetingId: "MTG-100",
    });
  });

  it("denies duplicate human meeting IDs even when both appear to be Drafts", () => {
    expect(() => resolveMeetingDraftTarget("MTG-100", [
      draft,
      { id: "record-b", meeting_id: "MTG-100", approval_status: "Draft" },
    ])).toThrow("ambiguous");
  });

  it("denies a human meeting ID that collides with another record ID", () => {
    expect(() => resolveMeetingDraftTarget("MTG-100", [
      draft,
      { id: "MTG-100", meeting_id: "MTG-200", approval_status: "Scheduled" },
    ])).toThrow("ambiguous");
  });

  it("does not accept conflicting saved Draft and non-Draft lifecycle states", () => {
    expect(() => resolveMeetingDraftTarget("MTG-100", [
      { ...draft, status: "Scheduled" },
    ])).toThrow("Only a meeting in Draft status");
  });

  it("never silently chooses the first duplicated registry record ID", () => {
    expect(() => resolveMeetingDraftTarget("record-a", [
      draft, { ...draft, meeting_id: "MTG-999" },
    ])).toThrow("ambiguous");
  });
});
