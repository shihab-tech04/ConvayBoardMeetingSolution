import { describe, expect, it } from "vitest";
import { actionItemDetailsPath } from "../app/pages/dashboard/actionItemDetailsPath";

describe("HM-03/HM-04 Action Item navigation from dashboard and calendar", () => {
  it("links the exact record instead of opening the generic list", () => {
    expect(actionItemDetailsPath("action-42"))
      .toBe("/decisions-followup/action-items?view=action-42");
  });
  it("preserves identifiers with punctuation and non-ASCII characters", () => {
    expect(actionItemDetailsPath("  a&b/বাংলা  "))
      .toBe("/decisions-followup/action-items?view=a%26b%2F%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE");
  });
  it("never fabricates a drawer selection for an absent id", () => {
    expect(actionItemDetailsPath("   "))
      .toBe("/decisions-followup/action-items");
  });
});
