/** Safety gate: code may be integrated before the server-backed Quick Meeting release. */
export function isLiveMeetingReleaseApproved(value: unknown): boolean {
  return value === "true";
}

/** Regular online meeting is independently released after its own SQL/Edge checks. */
export const LIVE_MEETINGS_RELEASED = isLiveMeetingReleaseApproved(import.meta.env.VITE_CONVAY_REGULAR_LIVE_ENABLED);

/** Quick Meeting needs separate guest/host SQL and Edge; never inherit the regular gate. */
export const QUICK_MEETINGS_RELEASED = isLiveMeetingReleaseApproved(import.meta.env.VITE_CONVAY_QUICK_MEETING_ENABLED);
