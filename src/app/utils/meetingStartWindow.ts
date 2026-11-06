export type MeetingStartWindowState = "invalid" | "too-early" | "available" | "closed";

const MINUTES_EARLY = 15;
const MINUTES_LATE = 120;
const HOUR_MS = 60 * 60 * 1000;
const formatters = new Map<string, Intl.DateTimeFormat>();

type WallTime = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function wallTimeAt(epochMs: number, timeZone: string): WallTime {
  const values = Object.fromEntries(formatterFor(timeZone).formatToParts(new Date(epochMs))
    .filter(part => part.type !== "literal")
    .map(part => [part.type, Number(part.value)]));
  return {
    year: values.year, month: values.month, day: values.day,
    hour: values.hour, minute: values.minute, second: values.second,
  };
}

function sameWallTime(left: WallTime, right: WallTime): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day &&
    left.hour === right.hour && left.minute === right.minute && left.second === right.second;
}

/**
 * Resolve a saved local meeting time using the IANA zone stored with the meeting.
 * When daylight-saving time repeats a local time, choose the later (standard-time)
 * instant, matching PostgreSQL's AT TIME ZONE resolution. A skipped spring-forward
 * time follows the same standard-time interpretation.
 */
function scheduledInstant(record: Record<string, unknown>): number | null {
  const date = String(record.meeting_date ?? "").trim();
  const time = String(record.start_time ?? "00:00").trim();
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [year, month, day] = dateMatch.slice(1).map(Number);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  const localWallTime: WallTime = { year, month, day, hour, minute, second };
  const localEpoch = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(localEpoch) || !sameWallTime({
    year: new Date(localEpoch).getUTCFullYear(),
    month: new Date(localEpoch).getUTCMonth() + 1,
    day: new Date(localEpoch).getUTCDate(),
    hour: new Date(localEpoch).getUTCHours(),
    minute: new Date(localEpoch).getUTCMinutes(),
    second: new Date(localEpoch).getUTCSeconds(),
  }, localWallTime)) return null;

  const zoneLabel = String(record.time_zone ?? "Asia/Dhaka").trim();
  const timeZone = zoneLabel.split(/\s+/)[0] || "Asia/Dhaka";
  try {
    const offsets = new Set<number>();
    for (const offsetHours of [-36, -12, 0, 12, 36]) {
      const sample = localEpoch + offsetHours * HOUR_MS;
      const displayed = wallTimeAt(sample, timeZone);
      const displayedAsUtc = Date.UTC(displayed.year, displayed.month - 1, displayed.day,
        displayed.hour, displayed.minute, displayed.second);
      offsets.add(displayedAsUtc - Math.floor(sample / 1000) * 1000);
    }
    const candidates = [...offsets].map(offset => localEpoch - offset);
    const exact = candidates.filter(candidate => sameWallTime(wallTimeAt(candidate, timeZone), localWallTime));
    return Math.max(...(exact.length ? exact : candidates));
  } catch {
    return null;
  }
}

export function meetingStartWindowState(
  record: Record<string, unknown>,
  now: Date,
): MeetingStartWindowState {
  const scheduled = scheduledInstant(record);
  if (scheduled === null || !Number.isFinite(now.getTime())) return "invalid";
  const minutesUntilStart = (scheduled - now.getTime()) / 60_000;
  if (minutesUntilStart > MINUTES_EARLY) return "too-early";
  if (minutesUntilStart < -MINUTES_LATE) return "closed";
  return "available";
}
