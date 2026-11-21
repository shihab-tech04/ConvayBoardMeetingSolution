import { describe, expect, it } from "vitest";
import { calendarDateWindows } from "../app/pages/dashboard/calendarDateWindows";
import { resolveFeaturedMeetings, type FeaturedMeetingTiming } from "../app/pages/dashboard/featuredMeetingSelection";

function meeting(
  sourceId: string,
  date: string,
  time: string,
  status = "Scheduled",
): FeaturedMeetingTiming {
  return { sourceId, type: "meeting", date, time, status };
}

describe("HM-05 featured meeting schedule", () => {
  const now = new Date(2026, 10, 22, 8, 30, 0);
  const today = calendarDateWindows(now).today;

  it("chooses the nearest future start in calendar-date and time order", () => {
    const result = resolveFeaturedMeetings([
      meeting("later", today, "11:00", "Published"),
      meeting("earlier-today", today, "07:45", "Scheduled"),
      meeting("next", today, "09:00", "Ready to Start"),
      meeting("tomorrow", "2026-11-23", "08:00", "Published"),
    ], now);

    expect(result.next?.sourceId).toBe("next");
  });

  it("does not promote elapsed, cancelled, completed, or unknown-state records", () => {
    const result = resolveFeaturedMeetings([
      meeting("elapsed", today, "07:30", "Scheduled"),
      meeting("cancelled", today, "09:00", "Cancelled"),
      meeting("completed", today, "09:15", "Completed"),
      meeting("unknown", today, "09:30", "Awaiting Room Confirmation"),
      meeting("pending", today, "10:00", "Pending Approval"),
      meeting("approved", today, "10:30", "Approved"),
    ], now);

    expect(result.next).toBeNull();
  });

  it("shows only persisted live or paused state and keeps resume separate from live", () => {
    const result = resolveFeaturedMeetings([
      meeting("paused", today, "08:00", "On Break"),
      meeting("live", today, "08:15", "In Progress"),
      meeting("next", today, "09:00", "Scheduled"),
    ], now);

    expect(result.live?.sourceId).toBe("live");
    expect(result.paused?.sourceId).toBe("paused");
    expect(result.next?.sourceId).toBe("next");
  });

  it("does not feature stale live or paused states from a different calendar day", () => {
    const result = resolveFeaturedMeetings([
      meeting("stale-live", "2026-11-21", "08:00", "In Progress"),
      meeting("stale-paused", "2026-11-21", "08:00", "On Break"),
    ], now);

    expect(result.live).toBeNull();
    expect(result.paused).toBeNull();
    expect(result.next).toBeNull();
  });

  it("does not mutate registry order while resolving deterministic ties", () => {
    const source = [
      meeting("z", today, "09:00", "Scheduled"),
      meeting("a", today, "09:00", "Scheduled"),
    ];

    expect(resolveFeaturedMeetings(source, now).next?.sourceId).toBe("a");
    expect(source.map(event => event.sourceId)).toEqual(["z", "a"]);
  });
});
