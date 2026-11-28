import { describe, expect, it } from "vitest";
import { isValidReportDateRange, reportDateMatchesRange } from "../app/components/pages/reportDateRange";

describe("RP-06 report civil-date boundaries", () => {
  it("includes both boundaries, regardless of time suffix", () => {
    expect(reportDateMatchesRange("2026-11-01", "2026-11-01", "2026-11-30")).toBe(true);
    expect(reportDateMatchesRange("2026-11-30T23:59:59+06:00", "2026-11-01", "2026-11-30")).toBe(true);
    expect(reportDateMatchesRange("2026-12-01", undefined, "2026-11-30")).toBe(false);
  });
  it.each([null, undefined, "", "invalid", "2026-02-29", "2026-11-01junk"])("excludes unknown or invalid bounded dates %s", value => {
    expect(reportDateMatchesRange(value, "2026-01-01")).toBe(false);
    expect(reportDateMatchesRange(value)).toBe(true);
  });
  it("rejects invalid and reversed input but permits open ranges", () => {
    expect(isValidReportDateRange("2026-11-30", "2026-11-01")).toBe(false);
    expect(isValidReportDateRange("2026-02-29")).toBe(false);
    expect(isValidReportDateRange("2024-02-29")).toBe(true);
    expect(isValidReportDateRange(undefined, "2026-11-30")).toBe(true);
  });
});
