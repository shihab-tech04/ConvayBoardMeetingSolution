import { describe, expect, it } from "vitest";
import { normalizeMeetingSchedule } from "../app/pages/return-register/meetingSchedule";

describe("MT-06 meeting date, time, and time zone", () => {
  it("keeps date, start, end, and selected time zone together for create and edit writes", () => {
    expect(normalizeMeetingSchedule({
      meeting_date: "2026-11-06",
      start_time: "09:30",
      end_time: "11:15",
      time_zone: "Asia/Dhaka (GMT+6)",
    })).toEqual({
      meeting_date: "2026-11-06",
      start_time: "09:30",
      end_time: "11:15",
      time_zone: "Asia/Dhaka (GMT+6)",
    });
  });

  it("uses the existing Dhaka default when a saved schedule has no time zone", () => {
    expect(normalizeMeetingSchedule({
      meeting_date: "2026-11-06",
      start_time: "09:30",
      end_time: "11:15",
    }).time_zone).toBe("Asia/Dhaka (GMT+6)");
  });
});
