import { describe, expect, it } from "vitest";
import { compareMeetingStart, meetingCountdown } from "../app/pages/dashboard/meetingScheduleTime";

describe("HM-05 persisted meeting date/time ordering", () => {
  it("sorts same-day meetings by real start time instead of original SQL row order", () => {
    const input = [
      { meeting_date: "2026-11-23", start_time: "15:30:00", id: "late" },
      { meeting_date: "2026-11-23", start_time: "09:05", id: "early" },
      { meeting_date: "2026-11-24", start_time: "07:00", id: "tomorrow" },
    ];
    expect([...input].sort(compareMeetingStart).map(m => m.id)).toEqual(["early", "late", "tomorrow"]);
    expect(input[0].id).toBe("late");
  });

  it("puts unknown start times after known starts without inventing a time", () => {
    const input = [
      { meeting_date: "2026-11-23", start_time: "", id: "unknown" },
      { meeting_date: "2026-11-23", start_time: "08:00", id: "known" },
      { meeting_date: "2026-11-23", start_time: "25:99", id: "invalid" },
    ];
    expect([...input].sort(compareMeetingStart).map(m => m.id)).toEqual(["known", "unknown", "invalid"]);
  });

  it("supports a precise HH:mm:ss countdown without NaN and fails closed on invalid source times", () => {
    const now = new Date(2026, 10, 23, 8, 30, 0);
    expect(meetingCountdown("2026-11-23", "09:15:00", now)).toBe("In 0h 45m");
    expect(meetingCountdown("2026-11-23", "08:29:00", now)).toBe("Now");
    expect(meetingCountdown("2026-11-23", "", now)).toBe("Time unavailable");
    expect(meetingCountdown("2026-11-23", "25:01", now)).toBe("Time unavailable");
    expect(meetingCountdown("2026-02-30", "09:15", now)).toBe("Time unavailable");
  });

  it("uses local calendar wall time rather than applying UTC ISO conversion", () => {
    const now = new Date(2026, 10, 23, 23, 45);
    expect(meetingCountdown("2026-11-24", "00:15", now)).toBe("In 0h 30m");
  });
});
