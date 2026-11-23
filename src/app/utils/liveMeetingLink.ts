/**
 * LiveKit is issued by this application's authenticated Edge gateway.
 * Meeting links are ordinary same-origin navigation, not meeting credentials.
 */
export function liveMeetingRoute(
  meetingId: string,
  entry: "join_meeting" | "start_meeting" = "join_meeting",
): string | null {
  const id = String(meetingId ?? "").trim();
  return id ? `/meetings/${encodeURIComponent(id)}/live?entry=${entry}` : null;
}

/** The only invitation URL uses the saved SQL meeting ID and deployed basename. */
export function liveMeetingUrl(
  meetingId: string,
  origin = typeof window === "undefined" ? "" : window.location.origin,
  basePath = import.meta.env.BASE_URL || "/",
): string | null {
  const path = liveMeetingRoute(meetingId);
  if (!path || !origin) return null;
  const baseParts = String(basePath).split("/").filter(Boolean);
  try {
    const url = new URL(`/${[...baseParts, path.slice(1)].join("/")}`, origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function liveMeetingInvitation(
  meetingId: string,
  origin?: string,
  basePath?: string,
): string | null {
  const link = liveMeetingUrl(meetingId, origin, basePath);
  return link ? [
    "Join your LiveKit board meeting securely through Convay.",
    "Sign in with your authorized account.",
    `Meeting: ${meetingId}`,
    `Join: ${link}`,
    "Access is subject to invitation, publication and meeting permissions.",
  ].join(String.fromCharCode(10)) : null;
}
