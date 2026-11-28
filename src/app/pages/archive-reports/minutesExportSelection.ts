/** MN-16: export only the selected record/version/revision, never a newer or
 * different record substituted by a refresh. Server RLS remains authoritative. */
const KEYS = ["id", "minutes_id", "meeting_id", "version", "approval_status"] as const;
type ExportIdentity = Partial<Record<typeof KEYS[number], unknown>>;
export function assertMinutesExportSelection(
  selected: ExportIdentity & { source_revision?: unknown },
  current: ExportIdentity,
  revision: unknown,
): void {
  if (!Number.isSafeInteger(selected.source_revision) || Number(selected.source_revision) < 1 ||
      selected.source_revision !== revision || KEYS.some(key =>
        typeof selected[key] !== "string" || !String(selected[key]).trim() || selected[key] !== current[key])) {
    throw new Error("The selected minutes version or revision changed. Reopen the record and retry export.");
  }
}
