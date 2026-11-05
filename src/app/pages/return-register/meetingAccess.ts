/** MT-09/MT-10: one shared rule for the three supported meeting modes. */
export const MEETING_MODE_OPTIONS = ["Physical", "Virtual", "Hybrid"] as const;

export function meetingAccessBlockers(values: Record<string, unknown>): string[] {
  const mode = String(values.mode ?? "Physical").trim();
  const venue = String(values.venue ?? "").trim();
  const virtualLink = String(values.virtual_link ?? "").trim();

  if (!MEETING_MODE_OPTIONS.some(option => option === mode)) {
    return ["Select a valid meeting mode"];
  }

  const blockers: string[] = [];
  if ((mode === "Physical" || mode === "Hybrid") && !venue) {
    blockers.push(`${mode} meeting requires a venue address`);
  }
  if ((mode === "Virtual" || mode === "Hybrid") && !virtualLink) {
    blockers.push(`${mode} meeting requires a virtual meeting link`);
  }
  return blockers;
}


/** Drafts may be incomplete; editing a scheduled/approved meeting must not erase required access. */
export function meetingUpdateAccessBlockers(
  current: Record<string, unknown> | undefined,
  submitted: Record<string, unknown>,
): string[] {
  const merged = { ...current, ...submitted };
  const status = String(merged.approval_status ?? merged.status ?? "");
  if (status === "Draft") return [];

  const changedAccess = (["mode", "venue", "virtual_link"] as const).some(key =>
    Object.prototype.hasOwnProperty.call(submitted, key)
      && String(submitted[key] ?? "") !== String(current?.[key] ?? ""),
  );
  return changedAccess ? meetingAccessBlockers(merged) : [];
}
