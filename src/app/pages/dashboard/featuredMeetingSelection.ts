import { calendarDateWindows } from "./calendarDateWindows";
import { resolveLifecycleStage } from "./meetingLifecycleStatus";

export interface FeaturedMeetingTiming {
  sourceId: string;
  type?: string;
  date: string;
  time?: string;
  status: string;
}

function calendarDateKey(value: string): string | null {
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
}

function parseClock(value: string | undefined): [number, number, number] | null {
  const match = /^(?:([01]\d|2[0-3])):([0-5]\d)(?::([0-5]\d))?$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

function isFutureStartOnOrAfterToday(event: FeaturedMeetingTiming, now: Date): boolean {
  const date = calendarDateKey(event.date);
  if (!date) return false;
  const today = calendarDateWindows(now).today;
  if (date > today) return true;
  if (date < today) return false;

  const clock = parseClock(event.time);
  if (!clock) return false;
  const [hour, minute, second] = clock;
  const scheduledAt = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, second,
  );
  return scheduledAt.getTime() > now.getTime();
}

export function isUpcomingCalendarMeeting(event: FeaturedMeetingTiming, now: Date): boolean {
  const stage = resolveLifecycleStage(event.status, event.date, now).stage;
  return (stage === "Upcoming Meeting" || stage === "Ready to Start")
    && isFutureStartOnOrAfterToday(event, now);
}

function isMeetingDatedToday(event: FeaturedMeetingTiming, now: Date): boolean {
  return calendarDateKey(event.date) === calendarDateWindows(now).today;
}

function compareSchedule(a: FeaturedMeetingTiming, b: FeaturedMeetingTiming): number {
  const dateOrder = a.date.slice(0, 10).localeCompare(b.date.slice(0, 10));
  if (dateOrder) return dateOrder;

  const timeKey = (event: FeaturedMeetingTiming) => {
    const parsed = parseClock(event.time);
    return parsed
      ? parsed.map(part => String(part).padStart(2, "0")).join("")
      : "999999";
  };
  return timeKey(a).localeCompare(timeKey(b)) || a.sourceId.localeCompare(b.sourceId);
}

/**
 * HM-05: choose featured records from persisted lifecycle states and actual
 * local start times. Calendar rows remain visible independently; this only
 * prevents a past, cancelled, completed, or unknown record from masquerading
 * as the next meeting.
 */
export function resolveFeaturedMeetings<T extends FeaturedMeetingTiming>(
  events: readonly T[],
  now: Date,
): { live: T | null; paused: T | null; next: T | null } {
  const meetings = events
    .filter(event => event.type === "meeting")
    .slice()
    .sort(compareSchedule);

  const stage = (event: FeaturedMeetingTiming) =>
    resolveLifecycleStage(event.status, event.date, now).stage;

  return {
    live: meetings.find(event => stage(event) === "Meeting Live" && isMeetingDatedToday(event, now)) ?? null,
    paused: meetings.find(event => stage(event) === "Meeting Paused" && isMeetingDatedToday(event, now)) ?? null,
    next: meetings.find(event => isUpcomingCalendarMeeting(event, now)) ?? null,
  };
}
