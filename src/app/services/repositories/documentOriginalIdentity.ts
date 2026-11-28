/** Validate a version-pinned original row before issuing any Storage request. */
export interface OriginalContentIdentity {
  id: string;
  document_id: string;
  version_id: string | null;
  content_type: string;
  storage_path: string | null;
  size: number;
}

export function validatePinnedOriginal(row: OriginalContentIdentity, documentId: string, versionId: string): void {
  const prefix = encodeURIComponent(documentId) + "/" + encodeURIComponent(versionId) + "/original/";
  if (!versionId || versionId !== versionId.trim() || /^(latest|live)$/i.test(versionId) ||
      row.id !== "file:" + documentId + ":" + versionId || row.document_id !== documentId ||
      row.version_id !== versionId || row.content_type !== "original_file" ||
      typeof row.storage_path !== "string" || !row.storage_path.startsWith(prefix) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.storage_path.slice(prefix.length)) ||
      !Number.isSafeInteger(row.size) || row.size < 0) {
    throw new Error("Original-file metadata does not match the selected historical version.");
  }
}
