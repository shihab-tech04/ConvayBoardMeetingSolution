/**
 * DC-14: PDF comments follow the existing document-thread registry and audit
 * registry. These UI helpers do not replace server-side permissions or RLS.
 */
export type PdfCommentFilter = "all" | "open" | "mine";

export function matchesPdfCommentFilter(
  thread: { document_id: string; status: string; created_by: string },
  documentId: string,
  filter: PdfCommentFilter,
  currentAuthorName: string,
): boolean {
  if (thread.document_id !== documentId) return false;
  if (filter === "open") return thread.status !== "resolved";
  if (filter === "mine") {
    const name = currentAuthorName.trim();
    // Existing thread schema has a display-name author, not a stable user ID.
    // This is a display filter only; database RLS remains authoritative.
    return name.length > 0 && thread.created_by === name;
  }
  return true;
}

/** Never report a saved comment before its authoritative registry write succeeds. */
export async function savePdfCommentWithAudit(
  saveComment: () => Promise<boolean> | boolean,
  saveAudit: () => Promise<boolean> | boolean,
): Promise<{ commentSaved: boolean; auditSaved: boolean }> {
  const commentSaved = await saveComment();
  if (!commentSaved) return { commentSaved: false, auditSaved: false };
  try {
    const auditSaved = await saveAudit();
    return { commentSaved: true, auditSaved: auditSaved === true };
  } catch {
    // The comment is already persisted; report audit failure separately.
    return { commentSaved: true, auditSaved: false };
  }
}
