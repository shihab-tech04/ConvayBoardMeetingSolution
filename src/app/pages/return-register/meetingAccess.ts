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
  // An incomplete Draft may be edited; an existing scheduled/approved
  // meeting cannot become an unvalidated Draft merely because one status
  // alias (or a submitted patch) says Draft. Both persisted and proposed
  // lifecycle states must explicitly and consistently be Draft.
  const isExplicitDraft = (row: Record<string, unknown>): boolean => {
    const statuses = [row.approval_status, row.status]
      .map(value => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
    return statuses.length > 0 && statuses.every(value => value === "draft");
  };
  if (current && isExplicitDraft(current) && isExplicitDraft(merged)) return [];

  const changedAccess = (["mode", "venue", "virtual_link"] as const).some(key =>
    Object.prototype.hasOwnProperty.call(submitted, key)
      && String(submitted[key] ?? "") !== String(current?.[key] ?? ""),
  );
  return changedAccess ? meetingAccessBlockers(merged) : [];
}
