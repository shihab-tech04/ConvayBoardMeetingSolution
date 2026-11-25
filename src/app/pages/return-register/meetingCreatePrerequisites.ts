/**
 * Create Meeting: only persisted, ACTIVE governance bodies can be chosen.
 * Absence of tenant data is a setup state, not permission to insert demo bodies.
 */
export interface MeetingGovernanceOptionSource {
  id?: string;
  body_id?: string;
  body_name: string;
  status?: string;
}

export function activeMeetingGovernanceOptions(bodies: readonly MeetingGovernanceOptionSource[]) {
  const seen = new Set<string>();
  return bodies.flatMap(body => {
    const value = String(body.id || body.body_id || "").trim();
    const label = String(body.body_name ?? "").trim();
    if (body.status !== "Active" || !value || !label || seen.has(value)) return [];
    seen.add(value);
    return [{ value, label }];
  });
}

export function meetingGovernanceSetupState(
  loading: boolean,
  error: string | null | undefined,
  activeOptions: readonly { value: string; label: string }[],
): "loading" | "error" | "missing" | "ready" {
  if (loading) return "loading";
  if (error) return "error";
  return activeOptions.length ? "ready" : "missing";
}
