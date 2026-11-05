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
