/** AG-02: required metadata for a complete (non-draft) parent agenda. */
export interface AgendaCreationFields {
  title: string;
  reference: string;
  committee: string;
  meeting_type: string;
  agenda_category: string;
  submitting_division: string;
  submitted_by: string;
  presenter_user_id: string;
  owner_user_id: string;
  purpose: string;
  confidentiality: string;
}

export type AgendaCreationErrors = Partial<Record<keyof AgendaCreationFields, string>>;

/** A generated canonical agenda ID is a valid reference when none is supplied. */
export function agendaReference(reference: string, generatedId: string): string {
  return reference.trim() || generatedId;
}

/** Save Draft may be partial, but continuing to the builder must never commit an incomplete agenda. */
export function validateCompleteAgenda(input: AgendaCreationFields): AgendaCreationErrors {
  const errors: AgendaCreationErrors = {};
  const required: Array<[keyof AgendaCreationFields, string]> = [
    ["title", "Agenda title is required."],
    ["committee", "Governance body is required."],
    ["meeting_type", "Meeting type is required."],
    ["agenda_category", "Category is required."],
    ["submitting_division", "Submitting division is required."],
    ["submitted_by", "Authenticated submitter is required."],
    ["presenter_user_id", "Presenter is required."],
    ["owner_user_id", "Owner is required."],
    ["purpose", "Purpose is required."],
    ["confidentiality", "Confidentiality is required."],
  ];
  for (const [key, message] of required) {
    if (!input[key].trim()) errors[key] = message;
  }
  // Reference can be explicitly supplied or automatically derived from the generated ID.
  return errors;
}
