/** Agenda purposes are selected on children as well as on parent records.
 * Keep filtering case/whitespace tolerant for old entries, but require a full
 * value match so "For Review" never matches an unrelated longer value. */
export function normalizeAgendaPurpose(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en")
    : "";
}

export function agendaPurposeMatches(
  purposes: readonly unknown[],
  selectedPurpose: unknown,
): boolean {
  const selected = normalizeAgendaPurpose(selectedPurpose);
  return !selected || purposes.some(value => normalizeAgendaPurpose(value) === selected);
}
