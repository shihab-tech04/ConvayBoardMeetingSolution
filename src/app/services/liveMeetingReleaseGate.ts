/** Safety gate: code may be integrated before the server-backed Quick Meeting release. */
export function isLiveMeetingReleaseApproved(value: unknown): boolean {
  return value === "true";
}

/** Opt-in only after verified Edge/SQL/LiveKit deployment and live guest admission. */
export const LIVE_MEETINGS_RELEASED = isLiveMeetingReleaseApproved(import.meta.env.VITE_CONVAY_LIVEKIT_ENABLED);
