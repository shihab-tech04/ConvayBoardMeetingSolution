import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

/**
 * HM-04: all event records use YYYY-MM-DD calendar dates. Serializing local
 * dates with toISOString() shifts the month/week/day for UTC+06 users.
 * Construct deadlines from local calendar dates to survive DST transitions.
 */
export function calendarDateWindows(now: Date) {
  const key = (day: Date): string => format(day, "yyyy-MM-dd");
  const onRelativeDay = (offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return {
    today: key(now),
    tomorrow: key(onRelativeDay(1)),
    weekStart: key(startOfWeek(now, { weekStartsOn: 1 })),
    weekEnd: key(endOfWeek(now, { weekStartsOn: 1 })),
    monthStart: key(startOfMonth(now)),
    monthEnd: key(endOfMonth(now)),
    cutoff7: key(onRelativeDay(7)),
    later60: key(onRelativeDay(60)),
  };
}
