/**
 * HM-05: use the persisted local meeting date and clock to order a day's
 * meetings and render the overview countdown. No default meeting time is
 * inferred when a source record is missing or malformed.
 */
function dateKey(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw
    ? raw : null;
}

function secondsOfDay(value: unknown): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(value ?? "").trim());
  return match
    ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0)
    : null;
}

export function compareMeetingStart(
  a: { meeting_date?: unknown; start_time?: unknown },
  b: { meeting_date?: unknown; start_time?: unknown },
): number {
  const dateA = dateKey(a.meeting_date) ?? "9999-12-31";
  const dateB = dateKey(b.meeting_date) ?? "9999-12-31";
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return (secondsOfDay(a.start_time) ?? Number.POSITIVE_INFINITY)
    - (secondsOfDay(b.start_time) ?? Number.POSITIVE_INFINITY) || 0;
}

export function meetingCountdown(date: unknown, time: unknown, now: Date): string {
  const key = dateKey(date);
  const seconds = secondsOfDay(time);
  if (!key || seconds === null) return "Time unavailable";
  const [year, month, day] = key.split("-").map(Number);
  const target = new Date(year, month - 1, day, 0, 0, seconds);
  const diff = target.getTime() - now.getTime();
  if (!Number.isFinite(diff)) return "Time unavailable";
  if (diff <= 0) return "Now";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `In ${days}d ${hours}h`;
  return `In ${hours}h ${Math.floor((diff % 3600000) / 60000)}m`;
}
