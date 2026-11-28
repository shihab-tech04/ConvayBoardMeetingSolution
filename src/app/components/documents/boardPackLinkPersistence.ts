import type { BoardDocument, BoardPack, DocumentVersion } from '../../data/boardMeetingData';
import type { BoardPackDocumentLink } from '../../data/documentWorkspaceData';

/** Resolve the document's current canonical version; never persist a display label. */
export function resolveBoardPackVersion(doc: BoardDocument, rows: readonly DocumentVersion[]): DocumentVersion | undefined {
  const ids = new Set([doc.doc_id, doc.id].filter(id => typeof id === "string" && id.trim()));
  const versions = rows.filter(v => ids.has(v.document_id));
  const pointer = doc.is_locked ? doc.locked_version_id : doc.current_version_id;
  if (doc.is_locked && !pointer) return undefined;
  const matches = versions.filter(v => pointer ? v.version_id === pointer : v.version_number === doc.version);
  if (matches.length !== 1) return undefined;
  const selected = matches[0];
  const id = selected.version_id;
  if (typeof id !== 'string' || !id.trim() || id !== id.trim() || /^(latest|live)$/i.test(id) || id === selected.version_number ||
      versions.filter(v => v.version_id === id).length !== 1) return undefined;
  return selected;
}

export function resolveDraftPack(reference: string, packs: readonly BoardPack[]): BoardPack | undefined {
  const matches = packs.filter(p => p.pack_id === reference || p.id === reference);
  return matches.length === 1 && matches[0].approval_status === 'Draft' ? matches[0] : undefined;
}

export function exactBoardPackLink(rows: readonly BoardPackDocumentLink[], intended: BoardPackDocumentLink): boolean {
  const matches = rows.filter(row => row.id === intended.id);
  return matches.length === 1 && (Object.keys(intended) as (keyof BoardPackDocumentLink)[])
    .every(key => Object.is(matches[0][key], intended[key]));
}
