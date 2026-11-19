import { describe, expect, it } from "vitest";
import { isLiveMeetingReleaseApproved } from "../app/services/liveMeetingReleaseGate";

describe("live-meeting production release gate", () => {
  it("does not activate missing backend routes by default or for ambiguous values", () => {
    for (const value of [undefined, null, false, true, "", "false", "TRUE", "1", "yes", 1, {}]) {
      expect(isLiveMeetingReleaseApproved(value)).toBe(false);
    }
  });
  it("requires an explicit exact opt-in", () => {
    expect(isLiveMeetingReleaseApproved("true")).toBe(true);
  });
});
