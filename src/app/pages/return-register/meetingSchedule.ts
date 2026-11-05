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
