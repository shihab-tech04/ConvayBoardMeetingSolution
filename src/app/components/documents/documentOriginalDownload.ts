/** Download orchestration; callers supply the authoritative store and browser sink. */
export async function retrieveOriginalForDownload<T extends Blob>(
  documentId: string,
  fallbackName: string,
  load: (documentId: string) => Promise<T | null>,
  dispatch: (file: T, downloadName: string) => void | Promise<void>,
): Promise<void> {
  const id = documentId.trim();
  if (!id) throw new Error("Document ID is missing.");
  const original = await load(id);
  if (!original) throw new Error("Original document file is unavailable.");

  const nameFromFile = (original as T & { name?: unknown }).name;
  const name = (typeof nameFromFile === "string" ? nameFromFile.trim() : "") ||
    fallbackName.trim() || "document";
  // A file name is data, not a filesystem path. Avoid sending path separators to the browser.
  await dispatch(original, name.replace(/[\\/]/g, "_"));
}

/** Historical downloads are never allowed to resolve a mutable version alias. */
export interface ExactVersionDownloadIdentity {
  document_id: string;
  version_id: string;
  version_number: string;
}

function exactIdentity(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 220 &&
    value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}

export async function retrieveVersionOriginalForDownload<T extends Blob>(
  documentId: string,
  version: ExactVersionDownloadIdentity,
  fallbackName: string,
  load: (documentId: string, versionId: string) => Promise<T | null>,
  assertCurrent: () => void,
  dispatch: (file: T, downloadName: string) => void,
): Promise<void> {
  if (!exactIdentity(documentId) || version.document_id !== documentId ||
      !exactIdentity(version.version_id) || /^(latest|live)$/i.test(version.version_id) ||
      version.version_id === version.version_number) {
    throw new Error("A matching, exact historical document version is required.");
  }
  assertCurrent();
  await retrieveOriginalForDownload(documentId, fallbackName, async id => {
    const original = await load(id, version.version_id);
    assertCurrent();
    return original;
  }, (file, name) => {
    assertCurrent();
    dispatch(file, name);
  });
}
