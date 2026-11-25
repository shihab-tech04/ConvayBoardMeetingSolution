/** DC-07: a document acknowledgement is scoped to an actor and a version. */
export interface AcknowledgementProof {
  id: string;
  documentId: string;
  actorName: string;
  versionId: string;
}
export interface AcknowledgementRecord {
  id: string;
  document_id: string;
  acknowledged_by: string;
  version_id?: string;
}

export function isCurrentVersionAcknowledged(
  records: readonly AcknowledgementRecord[],
  documentId: string,
  actorName: string,
  versionId: string,
): boolean {
  if (!documentId.trim() || !actorName.trim() || !versionId.trim()) return false;
  const actor = actorName.trim().toLocaleLowerCase();
  return records.some(row =>
    row.document_id === documentId &&
    row.acknowledged_by.trim().toLocaleLowerCase() === actor &&
    (row.version_id === versionId || (!row.version_id && versionId === "1.0")),
  );
}

/**
 * Server acknowledgement and fresh readback must both confirm the exact
 * document/version/actor record before UI can report success. This does not
 * replace server-side identity binding or document entitlement policies.
 */
export async function confirmDocumentAcknowledgement(
  write: () => boolean | Promise<boolean>,
  refresh: () => void | Promise<void>,
  read: () => AcknowledgementRecord | undefined,
  expected: AcknowledgementProof,
): Promise<void> {
  if (!expected.id.trim() || !expected.documentId.trim() ||
      !expected.actorName.trim() || !expected.versionId.trim()) {
    throw new Error("A valid acknowledgement identity is required.");
  }
  if (await write() !== true) {
    throw new Error("Acknowledgement was not confirmed by SQL. Refresh before retrying.");
  }
  await refresh();
  const record = read();
  if (!record || record.id !== expected.id ||
      record.document_id !== expected.documentId ||
      record.acknowledged_by !== expected.actorName ||
      record.version_id !== expected.versionId) {
    throw new Error("Acknowledgement SQL readback did not match this document version. Refresh before retrying.");
  }
}
