/**
 * DC document context: match a linked record by its complete ID.
 * Some stored display values use "<ID> — <title>" rather than an ID alone.
 * Never treat an unbounded prefix as identity (e.g. MTG-001 vs MTG-0010).
 * Display resolution is not a SQL/RLS authorization decision.
 */
export function matchesExactDocumentLinkReference(
  reference: unknown,
  candidateId: unknown,
): boolean {
  if (typeof reference !== "string" || typeof candidateId !== "string") return false;
  const id = candidateId.trim();
  const value = reference.trim();
  if (!id || !value || id !== candidateId) return false;
  return value === id || value.startsWith(id + " — ");
}
