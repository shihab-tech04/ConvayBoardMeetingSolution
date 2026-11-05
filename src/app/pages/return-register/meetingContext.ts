export interface MeetingContextPayload {
  confidentiality: string;
  purpose: string;
  description: string;
  notes: string;
}

export function mergeMeetingUpdateValues<T extends object>(
  existing: T | undefined,
  submitted: Record<string, unknown>,
): Record<string, unknown> {
  return { ...existing, ...submitted };
}

/** Keep the four meeting context fields distinct across create, draft, and edit writes. */
export function meetingContextPayload(
  values: Record<string, unknown>,
  fallbackConfidentiality: string,
): MeetingContextPayload {
  return {
    confidentiality: String(values.confidentiality ?? fallbackConfidentiality),
    purpose: String(values.purpose ?? ""),
    description: String(values.description ?? ""),
    notes: String(values.notes ?? ""),
  };
}
