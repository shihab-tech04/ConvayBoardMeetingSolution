/**
 * HM-01 overview rules.
 *
 * Board meeting dates are stored as ISO calendar dates (YYYY-MM-DD).
 * UTC serialization of a browser-local date shifts "today" before 06:00 in
 * Bangladesh, making due-today meetings disappear from the overview.
 * Keep date arithmetic in the user's local calendar, including DST days.
 */
function calendarKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dashboardCalendarWindow(now: Date): { today: string; weekEnd: string } {
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inSevenCalendarDays = new Date(
    localMidnight.getFullYear(), localMidnight.getMonth(), localMidnight.getDate() + 7,
  );
  return { today: calendarKey(localMidnight), weekEnd: calendarKey(inSevenCalendarDays) };
}

/** Preparing minutes is follow-up work, not an approval waiting for a reviewer. */
export function isMeetingApprovalPending(status: unknown): boolean {
  return status === "Pending Approval" || status === "Awaiting Approval";
}
