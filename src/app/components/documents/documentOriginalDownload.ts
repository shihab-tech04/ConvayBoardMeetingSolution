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
