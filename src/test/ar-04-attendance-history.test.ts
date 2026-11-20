import { describe, it, expect } from "vitest";
import { recordListState } from "../app/pages/archive-reports/recordListState";

describe("AR-04 attendance and participant registry states", () => {
  it("does not show a false empty state while loading", () => {
    expect(recordListState(true, null, 0)).toBe("loading");
    expect(recordListState(true, null, 2)).toBe("loading");
  });
  it("does not show protected stale rows after an error", () => {
    expect(recordListState(false, "permission denied", 0)).toBe("error");
    expect(recordListState(false, new Error("offline"), 2)).toBe("error");
  });
  it("shows empty only after a successful load", () => {
    expect(recordListState(false, null, 0)).toBe("empty");
    expect(recordListState(false, null, 4)).toBe("ready");
  });
  it("rejects malformed count values", () => {
    for (const n of [-1, NaN, Infinity, 0.1]) expect(recordListState(false, null, n)).toBe("error");
  });
});
