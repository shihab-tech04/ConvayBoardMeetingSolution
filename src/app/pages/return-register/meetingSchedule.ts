import { TIME_ZONES } from "../../data/boardMeetingData";

export interface MeetingSchedule {
  meeting_date: string;
  start_time: string;
  end_time: string;
  time_zone: string;
}

export function normalizeMeetingSchedule(values: Record<string, unknown>): MeetingSchedule {
  return {
    meeting_date: String(values.meeting_date ?? ""),
    start_time: String(values.start_time ?? ""),
    end_time: String(values.end_time ?? ""),
    time_zone: String(values.time_zone ?? "Asia/Dhaka (GMT+6)"),
  };
}


/**
 * MT-06: one date and two wall-clock times define a same-day meeting.
 * Validate before scheduling/rescheduling, not only when a browser renders
 * its time input. Time zones use the already-approved form options.
 */
export function validateMeetingSchedule(schedule: MeetingSchedule): string[] {
  const blockers: string[] = [];
  const date = schedule.meeting_date.trim();
  const start = schedule.start_time.trim();
  const end = schedule.end_time.trim();
  const zone = schedule.time_zone.trim();

  if (!date) {
    blockers.push("Meeting date is required");
  } else {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(date + "T00:00:00.000Z")
      : new Date(Number.NaN);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      blockers.push("Enter a valid meeting date");
    }
  }

  if (!start || !end) {
    blockers.push("Start and end time are required");
  } else {
    const validClock = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!validClock.test(start) || !validClock.test(end)) {
      blockers.push("Enter valid start and end times");
    } else if (end <= start) {
      blockers.push("End time must be later than start time");
    }
  }

  if (!TIME_ZONES.includes(zone)) {
    blockers.push("Select a valid time zone");
  }
  return blockers;
}
