/** DC-13 — document lock is authoritative for both version display and restore affordances. */
export interface VersionLockDocument { is_locked?: boolean | null; locked_version_id?: string | null }
export interface LockableVersion { id: string; version_id?: string | null }

export function isLockedVersion(
  doc: VersionLockDocument,
  version: LockableVersion,
): boolean {
  const lockedId = doc.locked_version_id?.trim();
  return !!doc.is_locked && !!lockedId && (version.id === lockedId || version.version_id === lockedId);
}

export function canRestoreVersion(doc: VersionLockDocument, isCurrent: boolean, canManage: boolean): boolean {
  return !!canManage && !doc.is_locked && !isCurrent;
}
