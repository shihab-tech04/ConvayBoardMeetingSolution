/**
 * Authenticated Convay Live Meeting is hosted by this app and uses LiveKit
 * via the server-side token issuer. There is no separate app.convay.com room,
 * deterministic password, or meeting-link credential.
 */
export function liveMeetingRoute(
  meetingId: string,
  entry: "join_meeting" | "start_meeting" = "join_meeting",
): string | null {
  const id = String(meetingId ?? "").trim();
  if (!id) return null;
  return `/meetings/${encodeURIComponent(id)}/live?entry=${entry}`;
}

/** Resolve the real Pages basename and same-origin LiveKit route for invitations. */
export function liveMeetingUrl(
  meetingId: string,
  origin = typeof window === "undefined" ? "https://shihab-tech04.github.io" : window.location.origin,
  basePath = import.meta.env.BASE_URL || "/",
): string | null {
  const route = liveMeetingRoute(meetingId);
  if (!route) return null;
  const base = `/${String(basePath || "/").replace(/^\\/+|\\/+$/g, "")}/`.replace(/^\\/\\//, "/");
  const u = new URL(`${base}${route.slice(1)}`, origin);
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  return u.href;
}

export function liveMeetingInvitation(meetingId: string, origin?: string, basePath?: string): string | null {
  const link = liveMeetingUrl(meetingId, origin, basePath);
  return link
    ? `Join the scheduled board meeting in Convay (LiveKit). Sign in with your authorized account.\\nMeeting: ${meetingId}\\nJoin: ${link}\\nAccess is subject to invitation, publication and meeting permissions.`
    : null;
}
