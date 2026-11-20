import { describe, expect, it } from "vitest";
import { normalizeMeetingSchedule, validateMeetingSchedule } from "../app/pages/return-register/meetingSchedule";

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

  const valid = {
    meeting_date: "2028-02-29",
    start_time: "09:30",
    end_time: "11:15",
    time_zone: "Asia/Dhaka (GMT+6)",
  };

  it("accepts a real leap day, canonical times, and every approved time zone", () => {
    for (const zone of [
      "Asia/Dhaka (GMT+6)", "UTC", "Asia/Kolkata (GMT+5:30)",
      "Asia/Singapore (GMT+8)", "Europe/London (GMT+0/+1)",
    ]) {
      expect(validateMeetingSchedule({ ...valid, time_zone: zone })).toEqual([]);
    }
  });

  it("rejects impossible dates and non-ISO dates without changing historical date policy", () => {
    for (const date of ["2027-02-29", "2026-02-30", "2026-13-01", "2026-11-31", "2026/11/20"]) {
      expect(validateMeetingSchedule({ ...valid, meeting_date: date }))
        .toContain("Enter a valid meeting date");
    }
    expect(validateMeetingSchedule({ ...valid, meeting_date: "" }))
      .toContain("Meeting date is required");
    expect(validateMeetingSchedule({ ...valid, meeting_date: "2023-01-01" })).toEqual([]);
  });

  it("rejects malformed, impossible, empty or equal times before a scheduling write", () => {
    for (const time of ["24:00", "10:61", "9:00", "10:00:59", "oops"]) {
      expect(validateMeetingSchedule({ ...valid, start_time: time }))
        .toContain("Enter valid start and end times");
    }
    expect(validateMeetingSchedule({ ...valid, end_time: "" }))
      .toContain("Start and end time are required");
    expect(validateMeetingSchedule({ ...valid, end_time: valid.start_time }))
      .toContain("End time must be later than start time");
    expect(validateMeetingSchedule({ ...valid, start_time: "16:00", end_time: "15:00" }))
      .toContain("End time must be later than start time");
  });

  it("rejects unsupported time-zone values while preserving the Dhaka default", () => {
    expect(validateMeetingSchedule({ ...valid, time_zone: "Mars/Phobos" }))
      .toContain("Select a valid time zone");
    expect(validateMeetingSchedule(normalizeMeetingSchedule({
      meeting_date: valid.meeting_date, start_time: valid.start_time, end_time: valid.end_time,
    }))).toEqual([]);
  });

});
