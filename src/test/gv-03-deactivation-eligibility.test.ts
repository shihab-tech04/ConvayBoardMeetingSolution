import { describe, expect, it } from "vitest";
import { unitCanDeactivate } from "../app/pages/governance/modals/unitDeactivationEligibility";

describe("GV-03 evidence-based organizational unit deactivation", () => {
  it("allows confirm only when every live dependency count is zero", () => {
    expect(unitCanDeactivate({ assignedUsers: 0, childUnits: 0, activeHeads: 0 })).toBe(true);
  });

  it("never considers a user assignment resolved based on a local acknowledgement", () => {
    expect(unitCanDeactivate({ assignedUsers: 1, childUnits: 0, activeHeads: 0 })).toBe(false);
  });

  it("never considers a remaining child hierarchy resolved", () => {
    expect(unitCanDeactivate({ assignedUsers: 0, childUnits: 3, activeHeads: 0 })).toBe(false);
  });

  it("requires leadership assignments to have genuinely ended", () => {
    expect(unitCanDeactivate({ assignedUsers: 0, childUnits: 0, activeHeads: 1 })).toBe(false);
  });

  it("fails closed on invalid, unknown or negative dependency counts", () => {
    for (const count of [NaN, Infinity, -1, 0.5]) {
      expect(unitCanDeactivate({ assignedUsers: count, childUnits: 0, activeHeads: 0 })).toBe(false);
    }
  });
});
