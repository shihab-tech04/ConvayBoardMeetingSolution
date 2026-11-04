/**
 * Show only agenda text entered by an authorized user.
 * A purpose hint is explicitly generic. It must never invent decisions,
 * financial amounts, participants, or meeting evidence.
 */
const PURPOSE_GUIDANCE: Record<string, string> = {
  "For noting": "This item is presented for information and formal noting. No decision is required.",
  "For approval": "Review the submitted proposal and supporting documents before considering approval.",
  "For discussion": "This item is intended for discussion and guidance. Refer to its supporting documents for details.",
  "For information": "This item is for information. Refer to the linked documents for the actual content.",
  "For review": "Review the available materials and record any observations or requested changes.",
};

export function getAgendaDescription(item: {
  title: string;
  description?: string | null;
  purpose?: string | null;
}): string {
  const submitted = item.description?.trim();
  if (submitted) return submitted;
  return PURPOSE_GUIDANCE[item.purpose ?? ""] ??
    "No description has been provided for this agenda item. Review its supporting documents or ask the meeting organizer.";
}
