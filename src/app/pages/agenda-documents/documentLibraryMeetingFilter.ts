import { matchesExactDocumentLinkReference } from "../../components/documents/documentLinkedRecordReference";

/**
 * DC-06 — read-only Related Meeting filter. The selected option is either
 * "All" or a canonical "ID — Title" entry; records can store ID alone or
 * that display representation. Neither a prefix nor a fabricated ID is a match.
 * SQL/RLS, not this display filter, remains the authorization boundary.
 */
export function matchesSelectedDocumentMeeting(
  relatedMeeting: unknown,
  selection: string | undefined,
): boolean {
  if (!selection || selection === "All") return true;
  const selectedId = selection.split(" — ", 1)[0].trim();
  return matchesExactDocumentLinkReference(relatedMeeting, selectedId);
}
