import { describe, expect, it } from "vitest";
import { calendarDateWindows } from "../app/pages/dashboard/calendarDateWindows";

describe("HM-04 local calendar range classification", () => {
  it("uses the local current date without UTC shifting", () => {
    const ranges = calendarDateWindows(new Date(2026, 10, 5, 0, 15));
    expect(ranges).toEqual({
      today: "2026-11-05", tomorrow: "2026-11-06",
      weekStart: "2026-11-02", weekEnd: "2026-11-08",
      monthStart: "2026-11-01", monthEnd: "2026-11-30",
      cutoff7: "2026-11-12", later60: "2027-01-04",
    });
  });

  it("crosses month/year boundaries without 24-hour UTC arithmetic", () => {
    const ranges = calendarDateWindows(new Date(2026, 11, 31, 23, 45));
    expect(ranges.today).toBe("2026-12-31");
    expect(ranges.tomorrow).toBe("2027-01-01");
    expect(ranges.monthStart).toBe("2026-12-01");
    expect(ranges.monthEnd).toBe("2026-12-31");
    expect(ranges.cutoff7).toBe("2027-01-07");
  });

  it("handles leap years and week boundaries using calendar dates", () => {
    const ranges = calendarDateWindows(new Date(2028, 1, 29, 1, 0));
    expect(ranges.today).toBe("2028-02-29");
    expect(ranges.tomorrow).toBe("2028-03-01");
    expect(ranges.monthEnd).toBe("2028-02-29");
    expect(ranges.weekStart).toBe("2028-02-28");
  });
});
