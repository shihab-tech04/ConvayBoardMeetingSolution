/** AR-01/02: Navigate only to the canonical record corresponding to the selected row. */
export function archiveRecordPath(value: unknown): string {
  if (typeof value !== "string") throw new Error("Meeting record ID is missing. Refresh the archive.");
  const id = value.trim();
  if (!id || id === "." || id === ".." || /[\u0000-\u001F\u007F]/u.test(id)) {
    throw new Error("Meeting record ID is invalid. Refresh the archive.");
  }
  return `/meetings/${encodeURIComponent(id)}/record`;
}
