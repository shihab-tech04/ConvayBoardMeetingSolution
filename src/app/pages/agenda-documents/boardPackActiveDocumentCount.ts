/** Read-only board-pack metadata derived from canonical document membership links. */
export interface PackIdentity {
  id: string;
  pack_id: string;
  document_count: string;
}

export interface PackDocumentMembership {
  board_pack_id: string;
  document_id: string;
  link_status?: string;
}

/** Preserve recorded metadata when no link rows are available to the caller. */
export function activeBoardPackDocumentCount(
  pack: PackIdentity,
  links: readonly PackDocumentMembership[],
): string {
  const matches = links.filter(link =>
    link.board_pack_id === pack.pack_id || link.board_pack_id === pack.id,
  );
  if (matches.length === 0) return pack.document_count;
  const activeIds = new Set(matches
    .filter(link => link.link_status === "active" && link.document_id.trim())
    .map(link => link.document_id));
  return String(activeIds.size);
}
