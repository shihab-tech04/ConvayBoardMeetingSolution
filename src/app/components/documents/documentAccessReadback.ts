/** Narrow document-sharing identity/readback proof; SQL/RLS remains authority. */
import type { DocumentAccessEntry } from "../../services/types/documents";

export interface ShareTargetUser {
  id: string;
  name: string;
  status: string;
}
const UUID_PATTERN = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

/**
 * Storage document RLS matches bms.doc.access.subject_id to auth.uid()::text.
 * Display names and employee IDs are never valid access targets.
 */
export function resolveUniqueActiveDocumentUserId(
  users: readonly ShareTargetUser[],
  selectedName: string,
): string {
  const matches = users.filter(user =>
    user.status === "Active" && user.name === selectedName);
  if (matches.length !== 1) {
    throw new Error("Select a unique active user before granting access.");
  }
  const userId = matches[0].id;
  if (!UUID_PATTERN.test(userId)) {
    throw new Error("The selected user has no verified authentication ID.");
  }
  return userId;
}

export function documentShareGrantReadback(
  records: readonly DocumentAccessEntry[],
  saved: DocumentAccessEntry,
  documentId: string,
  subjectId: string,
  permission: DocumentAccessEntry["permission"],
): boolean {
  return !!saved.id && records.some(row =>
    row.id === saved.id && row.document_id === documentId &&
    row.subject_type === "user" && row.subject_id === subjectId &&
    row.permission === permission);
}

export function documentShareRevokeReadback(
  records: readonly DocumentAccessEntry[], entryId: string,
): boolean {
  return !!entryId && !records.some(row => row.id === entryId);
}
